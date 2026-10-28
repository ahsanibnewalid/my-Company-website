from django.db import connection
from django_otp.plugins.otp_totp.models import TOTPDevice
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Tenant, Subscription, AuditLog
from .permissions import HasTenantPermission, IsPlatformExecutive, IsPortalAuthenticated
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
    permission_classes = [IsPortalAuthenticated]
    def get(self, request):
        return Response(MeSerializer(request.user).data)
class TenantViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TenantSerializer
    permission_classes = [IsPortalAuthenticated, IsPlatformExecutive]
    queryset = Tenant.objects.all().order_by("name")
class SubscriptionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SubscriptionSerializer
    permission_classes = [IsPortalAuthenticated, HasTenantPermission]
    required_permission = "billing.subscriptions.read"
    def get_queryset(self):
        membership = getattr(self.request, "tenant_membership", None)
        if membership is None:
            return Subscription.objects.none()
        return Subscription.objects.filter(tenant_id=membership.tenant_id).order_by("-created_at")
