import getpass
import uuid

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from platform_core.models import Membership, Role, Tenant, User


class Command(BaseCommand):
    help = "Create or assign a staff/client account with an active tenant. Passwords are prompted, never CLI arguments."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)
        parser.add_argument("--tenant", required=True, help="Existing tenant slug")
        parser.add_argument("--role", required=True, help="Seeded role code, e.g. client_user")

    def handle(self, *args, **opts):
        email = opts["email"].strip().lower()
        if not email or "@" not in email:
            raise CommandError("Enter a valid email address.")
        tenant = Tenant.objects.filter(slug=opts["tenant"], status=Tenant.Status.ACTIVE).first()
        role = Role.objects.filter(code=opts["role"]).first()
        if not tenant or not role:
            raise CommandError("Create an active tenant and seed roles first.")
        if role.code == "founder_ceo":
            raise CommandError("Create the CEO with createsuperuser, not this command.")

        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            password = getpass.getpass("New account password (minimum 14 characters): ")
            confirm = getpass.getpass("Repeat password: ")
            if password != confirm:
                raise CommandError("Passwords did not match.")
            proposed = User(email=email, username=f"member_{uuid.uuid4().hex[:20]}")
            try:
                validate_password(password, proposed)
            except ValidationError as exc:
                raise CommandError("; ".join(exc.messages)) from exc
            user = User.objects.create_user(
                username=proposed.username, email=email, password=password,
                mfa_required=bool(role.is_privileged or not role.code.startswith("client_")),
            )
        elif role.is_privileged or not role.code.startswith("client_"):
            user.mfa_required = True
            user.save(update_fields=["mfa_required"])

        Membership.objects.update_or_create(
            tenant=tenant, user=user,
            defaults={"role": role, "is_active": True},
        )
        self.stdout.write(self.style.SUCCESS(f"Membership configured for {email} in {tenant.slug}."))
        if user.mfa_required or role.is_privileged:
            self.stdout.write("MFA required: run python manage.py enroll_totp --email " + email)
