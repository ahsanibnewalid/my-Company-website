from django.test import TestCase, override_settings
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken

from platform_core.models import AuditLog, PublicInquiry, User


@override_settings(WEBSITE_SUBMISSION_KEY="test-only-shared-submission-secret", ADMIN_ALLOWED_EMAILS={"owner@example.com"})
class PublicInquiryTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()
        self.valid = {
            "kind": "project",
            "name": "Alex Doe",
            "email": "ALEX@example.com",
            "organization": "Northstar",
            "track": "",
            "message": "We need a secure company portal for our customers.",
            "consent": True,
        }

    def submit(self, payload=None, secret="test-only-shared-submission-secret"):
        return self.client_api.post(
            "/api/inquiries/submit/", self.valid if payload is None else payload,
            format="json", HTTP_X_WEBSITE_SUBMISSION_KEY=secret,
        )

    def authorize(self, user, mfa_verified):
        token = AccessToken.for_user(user)
        token["mfa_verified"] = mfa_verified
        self.client_api.credentials(HTTP_AUTHORIZATION="Bearer " + str(token))

    def test_saves_valid_project_and_career_without_email(self):
        response = self.submit()
        self.assertEqual(response.status_code, 201)
        self.assertTrue(response.data["reference"])
        record = PublicInquiry.objects.get()
        self.assertEqual(record.email, "alex@example.com")
        self.assertEqual(record.status, PublicInquiry.Status.NEW)
        self.assertTrue(record.consent_at)
        career = self.submit({**self.valid, "kind": "career", "track": "Junior Student Intern"})
        self.assertEqual(career.status_code, 201)
        self.assertEqual(PublicInquiry.objects.count(), 2)

    def test_no_database_write_without_secret_or_with_invalid_secret(self):
        self.assertEqual(self.submit(secret="wrong").status_code, 403)
        self.assertEqual(self.submit(secret="").status_code, 403)
        with override_settings(WEBSITE_SUBMISSION_KEY=""):
            self.assertEqual(self.submit().status_code, 503)
        self.assertFalse(PublicInquiry.objects.exists())

    def test_server_validation_rejects_bad_payloads(self):
        invalid = [
            {**self.valid, "consent": False},
            {**self.valid, "message": "short"},
            {**self.valid, "kind": "career", "track": ""},
            {**self.valid, "kind": "career", "track": "CEO"},
            {**self.valid, "email": "not-an-email"},
        ]
        for payload in invalid:
            with self.subTest(payload=payload):
                self.assertEqual(self.submit(payload).status_code, 400)
        self.assertFalse(PublicInquiry.objects.exists())

    def test_owner_can_review_and_change_status_with_audit(self):
        self.submit()
        record = PublicInquiry.objects.get()
        owner = User.objects.create_superuser(
            username="owner", email="owner@example.com", password="TestOwnerPassword123!"
        )
        self.authorize(owner, True)
        result = self.client_api.get("/api/portal/inquiries/")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["total"], 1)
        self.assertEqual(result.data["inquiries"][0]["id"], str(record.pk))
        changed = self.client_api.patch(
            f"/api/portal/inquiries/{record.pk}/",
            {"status": "reviewing"}, format="json",
        )
        self.assertEqual(changed.status_code, 200)
        record.refresh_from_db()
        self.assertEqual(record.status, "reviewing")
        self.assertTrue(AuditLog.objects.filter(action="inquiry.status_changed", actor=owner).exists())
        self.assertEqual(self.client_api.patch(
            f"/api/portal/inquiries/{record.pk}/", {"status": "invalid"}, format="json"
        ).status_code, 400)

    def test_public_and_non_owner_users_cannot_read_or_edit_queue(self):
        self.submit()
        record = PublicInquiry.objects.get()
        self.assertEqual(self.client_api.get("/api/portal/inquiries/").status_code, 401)
        user = User.objects.create_user(
            username="client", email="client@example.com",
            password="TestClientPassword123!", mfa_required=False,
        )
        self.authorize(user, False)
        self.assertEqual(self.client_api.get("/api/portal/inquiries/").status_code, 403)
        self.assertEqual(self.client_api.patch(
            f"/api/portal/inquiries/{record.pk}/", {"status": "closed"}, format="json"
        ).status_code, 403)
        owner = User.objects.create_superuser(
            username="owner2", email="owner2@example.com", password="TestOwnerPassword123!"
        )
        self.authorize(owner, False)
        self.assertEqual(self.client_api.get("/api/portal/inquiries/").status_code, 403)
