from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django_otp.admin import OTPAdminSite
from .permissions import is_predefined_admin
from .models import (
    User, Tenant, Role, Membership, Subscription, AuditLog,
    CodeDeployment, Project, SupportTicket, PublicInquiry,
)

class OwnerOnlyAdminSite(OTPAdminSite):
    def has_permission(self, request):
        return super().has_permission(request) and is_predefined_admin(request.user)


otp_admin_site = OwnerOnlyAdminSite(OTPAdminSite.name)
otp_admin_site.site_header = "Axiom Labs — verified administration"
otp_admin_site.site_title = "Axiom Labs Admin"
otp_admin_site.index_title = "Company operations"

class PlatformUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "is_staff", "is_active", "mfa_required")
    fieldsets = UserAdmin.fieldsets + (("Security", {"fields": ("email_verified_at", "mfa_required")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Identity", {"fields": ("email",)}),)

otp_admin_site.register(User, PlatformUserAdmin)
for model in (Tenant, Role, Membership, Subscription, AuditLog, CodeDeployment, Project, SupportTicket):
    otp_admin_site.register(model)


class PublicInquiryAdmin(admin.ModelAdmin):
    list_display = ("created_at", "kind", "name", "email", "status")
    list_filter = ("kind", "status", "created_at")
    search_fields = ("name", "email", "organization", "message")
    readonly_fields = (
        "id", "kind", "name", "email", "organization", "track",
        "message", "consent_at", "created_at", "updated_at",
    )

otp_admin_site.register(PublicInquiry, PublicInquiryAdmin)
