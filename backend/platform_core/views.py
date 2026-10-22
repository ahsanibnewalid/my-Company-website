from django.db import connection
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Tenant, Subscription, AuditLog
from .permissions import HasTenantPermission, IsPlatformExecutive
from .serializers import TenantSerializer, SubscriptionSerializer, MeSerializer
class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    def get(self, request):
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return Response({"status": "ok", "database": "ok"})
        except Exception:
            return Response({"status": "degraded"}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        return Response(MeSerializer(request.user).data)
class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [IsAuthenticated, IsPlatformExecutive]
    queryset = Tenant.objects.all().order_by("name")
class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsAuthenticated, HasTenantPermission]
    required_permission = "billing.subscriptions.read"
    def get_queryset(self):
        membership = getattr(self.request, "tenant_membership", None)
        if membership is None:
            return Subscription.objects.none()
        return Subscription.objects.filter(tenant_id=membership.tenant_id).order_by("-created_at")
class MFASetupView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        device = TOTPDevice.objects.filter(user=request.user, confirmed=False, name="primary").first()
        if not device:
            device = TOTPDevice.objects.create(user=request.user, name="primary", confirmed=False)
        return Response({"provisioning_uri": device.config_url})
class MFAVerifyView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        token = str(request.data.get("token", ""))
        device = TOTPDevice.objects.filter(user=request.user, name="primary").first()
        if not device or not device.verify_token(token):
            return Response({"detail": "Invalid MFA token."}, status=status.HTTP_400_BAD_REQUEST)
        if not device.confirmed:
            device.confirmed = True
            device.save(update_fields=["confirmed"])
        AuditLog.objects.create(actor=request.user, action="auth.mfa.verified", target_type="user", target_id=str(request.user.pk))
        return Response({"mfa_enabled": True})
