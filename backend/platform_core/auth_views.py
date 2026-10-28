"""Password + TOTP issuance. No password tokens are issued by the default SimpleJWT view."""
from django.contrib.auth import authenticate
from django.db import transaction
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuditLog, Membership
from .serializers import MeSerializer


def requires_mfa(user):
    return bool(
        user.is_superuser or user.is_staff or user.mfa_required
        or Membership.objects.filter(user=user, is_active=True, role__is_privileged=True).exists()
    )


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    def post(self, request):
        email = str(request.data.get("email", "")).strip().lower()
        password = request.data.get("password", "")
        code = str(request.data.get("otp", "")).strip()
        invalid = {"detail": "Invalid credentials or verification code."}
        if len(email) > 254 or not isinstance(password, str) or len(password) > 1024:
            return Response(invalid, status=status.HTTP_401_UNAUTHORIZED)

        user = authenticate(request, username=email, password=password)
        if user is None or not user.is_active:
            return Response(invalid, status=status.HTTP_401_UNAUTHORIZED)

        if not user.is_superuser and not Membership.objects.filter(
            user=user, is_active=True, tenant__status="active"
        ).exists():
            return Response(
                {"detail": "No active workspace is assigned to this account."},
                status=status.HTTP_403_FORBIDDEN,
            )

        if requires_mfa(user):
            with transaction.atomic():
                device = TOTPDevice.objects.select_for_update().filter(
                    user=user, confirmed=True, name="primary"
                ).first()
                if not device or not code.isdigit() or len(code) != 6 or not device.verify_token(code):
                    return Response(invalid, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        AuditLog.objects.create(
            actor=user, action="auth.portal.login", target_type="user", target_id=str(user.pk)
        )
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": MeSerializer(user).data,
        })


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "logout"

    def post(self, request):
        token = request.data.get("refresh")
        if isinstance(token, str) and token:
            try:
                RefreshToken(token).blacklist()
            except Exception:
                # Idempotent logout; the frontend always clears its cookies.
                pass
        return Response({"ok": True})
