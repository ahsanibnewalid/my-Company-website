from django.core.management.base import BaseCommand, CommandError
from django_otp.plugins.otp_totp.models import TOTPDevice
from platform_core.models import User


class Command(BaseCommand):
    help = "Interactively enroll a TOTP authenticator for an existing user."

    def add_arguments(self, parser):
        parser.add_argument("--email", required=True)

    def handle(self, *args, **opts):
        user = User.objects.filter(email__iexact=opts["email"].strip()).first()
        if user is None:
            raise CommandError("Unknown account.")
        device = TOTPDevice.objects.filter(user=user, name="primary").first()
        if device and device.confirmed:
            raise CommandError("A confirmed primary device already exists. Use a reviewed recovery process.")
        if not device:
            device = TOTPDevice.objects.create(user=user, name="primary", confirmed=False)
        self.stdout.write("This enrollment URI contains a secret. Keep it private and do not screenshot/share it.")
        self.stdout.write(device.config_url)
        token = input("Enter the current six-digit authenticator code: ").strip()
        if not (len(token) == 6 and token.isdigit() and device.verify_token(token)):
            raise CommandError("Verification failed. Device remains unconfirmed.")
        device.confirmed = True
        device.save(update_fields=["confirmed"])
        self.stdout.write(self.style.SUCCESS("TOTP enrollment confirmed."))
