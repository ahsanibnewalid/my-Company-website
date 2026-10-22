from rest_framework.permissions import BasePermission
from .models import Membership
class HasTenantPermission(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        tenant_id = request.headers.get("X-Tenant-ID")
        permission_code = getattr(view, "required_permission", None)
        if not tenant_id or not permission_code:
            return False
        membership = Membership.objects.select_related("role", "tenant").filter(tenant_id=tenant_id, user=request.user, is_active=True, tenant__status="active").first()
        if not membership:
            return False
        request.tenant_membership = membership
        request.tenant = membership.tenant
        return permission_code in membership.role.permissions
class IsPlatformExecutive(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)
