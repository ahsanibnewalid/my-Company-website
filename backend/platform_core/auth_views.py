"""Password + TOTP issuance. No password tokens are issued by the default SimpleJWT view."""
import hashlib
from django.contrib.auth import authenticate
from django.db import transaction
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle, SimpleRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import AuditLog, Membership
from .permissions import requires_mfa
from .serializers import MeSerializer


class LoginEmailThrottle(SimpleRateThrottle):
    """Rate limit by hashed login identity; BFF requests otherwise share a proxy IP."""
    scope = "login"

    def get_cache_key(self, request, view):
        supplied = request.data.get("email", "") if isinstance(request.data, dict) else ""
        email = str(supplied).strip().lower()[:254]
        identity = hashlib.sha256(email.encode("utf-8")).hexdigest()
        return self.cache_format % {"scope": self.scope, "ident": identity}


class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginEmailThrottle]

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
        refresh["mfa_verified"] = requires_mfa(user)
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
