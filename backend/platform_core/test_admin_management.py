import pyotp
from django.core.cache import cache
from django.test import TestCase, override_settings
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from platform_core.models import AuditLog, Membership, Role, Tenant, User


@override_settings(ADMIN_ALLOWED_EMAILS={"approved@example.com"})
class PredefinedAdminTests(TestCase):
    def setUp(self):
        cache.clear()
        self.api = APIClient()
        self.owner = User.objects.create_superuser(
            username="approved", email="approved@example.com",
            password="ApprovedAdminPassword123!",
        )
        self.device = TOTPDevice.objects.create(
            user=self.owner, name="primary", confirmed=True
        )
        self.other_admin = User.objects.create_superuser(
            username="other", email="other@example.com",
            password="OtherAdminPassword123!",
        )
        self.other_device = TOTPDevice.objects.create(
            user=self.other_admin, name="primary", confirmed=True
        )
        self.tenant = Tenant.objects.create(slug="northstar", name="Northstar", status="active")
        self.role = Role.objects.create(
            code="client_user", name="Client User", tier="client",
            permissions=["portal.projects.read"],
        )

    def owner_login(self, email="approved@example.com", password="ApprovedAdminPassword123!", otp=None):
        return self.api.post(
            "/api/auth/admin/token/",
            {"email": email, "password": password,
             "otp": otp if otp is not None else pyotp.parse_uri(self.device.config_url).now()},
            format="json",
        )

    def authorize(self, user, mfa_verified=True):
        token = AccessToken.for_user(user)
        token["mfa_verified"] = mfa_verified
        self.api.credentials(HTTP_AUTHORIZATION="Bearer " + str(token))

    def test_admin_login_requires_preapproval_and_totp(self):
        self.assertEqual(self.owner_login(otp="").status_code, 401)
        logged_in = self.owner_login()
        self.assertEqual(logged_in.status_code, 200)
        self.assertTrue(logged_in.data["user"]["is_owner"])
        self.authorize(self.owner)
        self.assertEqual(self.api.get("/api/admin/overview/").status_code, 200)
        self.assertEqual(self.api.get("/api/portal/overview/").data["persona"], "owner")

        self.api.credentials()
        token = pyotp.parse_uri(self.other_device.config_url).now()
        self.assertEqual(self.owner_login(
            "other@example.com", "OtherAdminPassword123!", token
        ).status_code, 401)
        self.assertEqual(self.api.post("/api/auth/token/", {
            "email": "other@example.com", "password": "OtherAdminPassword123!", "otp": token,
        }, format="json").status_code, 401)

    def test_empty_allowlist_denies_owner_access(self):
        with override_settings(ADMIN_ALLOWED_EMAILS=set()):
            self.assertEqual(self.owner_login().status_code, 401)
            self.authorize(self.owner)
            self.assertEqual(self.api.get("/api/admin/overview/").status_code, 403)
            self.assertEqual(self.api.get("/api/portal/overview/").status_code, 403)

    def test_staff_client_and_unlisted_superuser_cannot_manage(self):
        user = User.objects.create_user(
            username="client", email="client@example.com",
            password="ClientPasswordForTests123!", mfa_required=False,
        )
        Membership.objects.create(user=user, tenant=self.tenant, role=self.role)
        self.authorize(user, False)
        self.assertEqual(self.api.get("/api/admin/overview/").status_code, 403)
        self.assertEqual(self.api.post(
            "/api/admin/tenants/", {"name": "Bad", "slug": "bad"}, format="json"
        ).status_code, 403)
        self.authorize(self.other_admin)
        self.assertEqual(self.api.get("/api/admin/overview/").status_code, 403)

    def test_owner_creates_tenant_and_member_and_changes_access(self):
        self.authorize(self.owner)
        created = self.api.post(
            "/api/admin/tenants/", {"name": "Orbit Labs", "slug": "orbit-labs"}, format="json"
        )
        self.assertEqual(created.status_code, 201)
        tenant = Tenant.objects.get(slug="orbit-labs")
        self.assertEqual(tenant.status, "provisioning")
        changed = self.api.patch(
            f"/api/admin/tenants/{tenant.pk}/", {"status": "active"}, format="json"
        )
        self.assertEqual(changed.status_code, 200)

        user_response = self.api.post("/api/admin/users/", {
            "email": "NEW@EXAMPLE.COM", "first_name": "New", "last_name": "Member",
            "tenant_id": str(tenant.pk), "role_code": self.role.code,
        }, format="json")
        self.assertEqual(user_response.status_code, 201)
        self.assertGreaterEqual(len(user_response.data["temporary_password"]), 30)
        new_user = User.objects.get(email="new@example.com")
        self.assertFalse(new_user.is_superuser)
        self.assertTrue(new_user.check_password(user_response.data["temporary_password"]))
        self.assertTrue(Membership.objects.filter(user=new_user, tenant=tenant).exists())
        self.assertTrue(AuditLog.objects.filter(action="member.created").exists())
        self.assertEqual(self.api.post("/api/admin/users/", {
            "email": "NEW@EXAMPLE.COM", "tenant_id": str(tenant.pk),
            "role_code": self.role.code,
        }, format="json").status_code, 409)

        disabled = self.api.patch(
            f"/api/admin/users/{new_user.pk}/", {"is_active": False}, format="json"
        )
        self.assertEqual(disabled.status_code, 200)
        new_user.refresh_from_db()
        self.assertFalse(new_user.is_active)
        self.assertEqual(self.api.patch(
            f"/api/admin/users/{self.owner.pk}/", {"is_active": False}, format="json"
        ).status_code, 403)

    def test_existing_member_assignment_enforces_mfa_and_rejects_owner_role(self):
        user = User.objects.create_user(
            username="client", email="client@example.com",
            password="ClientPasswordForTests123!", mfa_required=False,
        )
        Role.objects.create(
            code="customer_success", name="Customer Success",
            tier="growth-product-ops", permissions=["portal.tickets.manage"],
        )
        Role.objects.create(
            code="founder_ceo", name="Founder CEO", tier="executive-core",
            permissions=["platform.tenants.manage"], is_privileged=True,
        )
        self.authorize(self.owner)
        rejected = self.api.post("/api/admin/memberships/", {
            "user_id": str(user.pk), "tenant_id": str(self.tenant.pk),
            "role_code": "founder_ceo",
        }, format="json")
        self.assertEqual(rejected.status_code, 403)
        assigned = self.api.post("/api/admin/memberships/", {
            "user_id": str(user.pk), "tenant_id": str(self.tenant.pk),
            "role_code": "customer_success",
        }, format="json")
        self.assertEqual(assigned.status_code, 201)
        user.refresh_from_db()
        self.assertTrue(user.mfa_required)
        self.assertTrue(AuditLog.objects.filter(action="membership.assigned").exists())
