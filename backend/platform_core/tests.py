import pyotp
from django.core.cache import cache
from django.test import TestCase
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework.test import APIClient
from platform_core.models import Membership, Project, Role, SupportTicket, Tenant, User


class PortalAuthTests(TestCase):
    def setUp(self):
        cache.clear()  # Isolate login throttle state across tests.
        self.client_api = APIClient()
        self.owner = User.objects.create_superuser(
            username="owner", email="owner@example.com", password="OwnerPasswordForTests123!"
        )
        self.owner_device = TOTPDevice.objects.create(
            user=self.owner, name="primary", confirmed=True
        )
        self.tenant = Tenant.objects.create(slug="northstar", name="Northstar", status="active")
        self.other_tenant = Tenant.objects.create(slug="orbit", name="Orbit", status="active")
        self.client_role = Role.objects.create(
            code="client_user", name="Client User", tier="client",
            permissions=["portal.projects.read", "portal.tickets.read", "portal.tickets.create"]
        )
        self.staff_role = Role.objects.create(
            code="customer_success", name="Customer Success", tier="growth",
            permissions=["portal.projects.read", "portal.tickets.read", "portal.tickets.manage",
                         "portal.tickets.create"]
        )
        self.client_user = User.objects.create_user(
            username="client", email="client@example.com",
            password="ClientPasswordForTests123!", mfa_required=False
        )
        self.staff = User.objects.create_user(
            username="staff", email="staff@example.com",
            password="StaffPasswordForTests123!", mfa_required=False
        )
        Membership.objects.create(user=self.client_user, tenant=self.tenant, role=self.client_role)
        Membership.objects.create(user=self.staff, tenant=self.tenant, role=self.staff_role)
        Project.objects.create(tenant=self.tenant, name="Client portal rollout")
        Project.objects.create(tenant=self.other_tenant, name="Hidden project")

    def login(self, email, password, otp=""):
        return self.client_api.post("/api/auth/token/", {
            "email": email, "password": password, "otp": otp
        }, format="json")

    def authorize(self, token):
        self.client_api.credentials(HTTP_AUTHORIZATION="Bearer " + token)

    def test_owner_requires_valid_totp(self):
        self.assertEqual(self.login("owner@example.com", "OwnerPasswordForTests123!").status_code, 401)
        token = pyotp.parse_uri(self.owner_device.config_url).now()
        response = self.login("owner@example.com", "OwnerPasswordForTests123!", otp=token)
        self.assertEqual(response.status_code, 200)
        self.authorize(response.data["access"])
        overview = self.client_api.get("/api/portal/overview/")
        self.assertEqual(overview.data["persona"], "owner")
        self.assertEqual(overview.data["summary"]["tenants"], 2)

    def test_client_can_only_access_own_tenant(self):
        login = self.login("client@example.com", "ClientPasswordForTests123!")
        self.assertEqual(login.status_code, 200)
        self.authorize(login.data["access"])
        own = self.client_api.get("/api/portal/projects/", HTTP_X_TENANT_ID=str(self.tenant.id))
        foreign = self.client_api.get("/api/portal/projects/", HTTP_X_TENANT_ID=str(self.other_tenant.id))
        self.assertEqual(own.status_code, 200)
        self.assertEqual(len(own.data["projects"]), 1)
        self.assertEqual(foreign.status_code, 403)
        self.assertEqual(self.client_api.post(
            "/api/portal/projects/", {"name": "Not allowed"},
            format="json", HTTP_X_TENANT_ID=str(self.tenant.id)
        ).status_code, 403)

    def test_client_support_ticket_and_staff_management(self):
        client_token = self.login("client@example.com", "ClientPasswordForTests123!").data["access"]
        self.authorize(client_token)
        created = self.client_api.post("/api/portal/tickets/", {
            "subject": "Need a project update",
            "message": "Can you share the latest progress please?"
        }, format="json", HTTP_X_TENANT_ID=str(self.tenant.id))
        self.assertEqual(created.status_code, 201)
        self.assertEqual(SupportTicket.objects.filter(tenant=self.tenant).count(), 1)
        forbidden = self.client_api.patch(
            f'/api/portal/tickets/{created.data["id"]}/', {"status": "resolved"},
            format="json", HTTP_X_TENANT_ID=str(self.tenant.id)
        )
        self.assertEqual(forbidden.status_code, 403)
        self.client_api.credentials()
        staff_token = self.login("staff@example.com", "StaffPasswordForTests123!").data["access"]
        self.authorize(staff_token)
        updated = self.client_api.patch(
            f'/api/portal/tickets/{created.data["id"]}/', {"status": "resolved"},
            format="json", HTTP_X_TENANT_ID=str(self.tenant.id)
        )
        self.assertEqual(updated.status_code, 200)

    def test_missing_membership_cannot_log_in(self):
        User.objects.create_user(
            username="orphan", email="orphan@example.com",
            password="OrphanPasswordForTests123!", mfa_required=False
        )
        self.assertEqual(self.login(
            "orphan@example.com", "OrphanPasswordForTests123!"
        ).status_code, 403)

    def test_invalid_login(self):
        self.assertEqual(self.login("client@example.com", "wrong-password").status_code, 401)
