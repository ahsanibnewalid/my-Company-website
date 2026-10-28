from django.contrib.auth.admin import UserAdmin
from django_otp.admin import OTPAdminSite
from .models import (
    User, Tenant, Role, Membership, Subscription, AuditLog,
    CodeDeployment, Project, SupportTicket,
)

otp_admin_site = OTPAdminSite(OTPAdminSite.name)
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
