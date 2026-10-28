from django.conf import settings
from rest_framework.permissions import BasePermission, IsAuthenticated
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
def is_predefined_admin(user):
    """Fail closed: both a privileged account and explicit email approval are required."""
    return bool(
        user and user.is_authenticated and user.is_active
        and user.is_superuser and user.is_staff
        and user.email.strip().lower() in settings.ADMIN_ALLOWED_EMAILS
    )


class IsPlatformExecutive(BasePermission):
    def has_permission(self, request, view):
        return is_predefined_admin(request.user)


def requires_mfa(user):
    return bool(
        user.is_superuser or user.is_staff or user.mfa_required
        or Membership.objects.filter(user=user, is_active=True, role__is_privileged=True).exists()
    )


class IsPortalAuthenticated(IsAuthenticated):
    """A fresh MFA-verified token is required whenever an account becomes privileged."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        verified = bool(getattr(request, "auth", None) and request.auth.get("mfa_verified", False))
        return not requires_mfa(request.user) or verified
