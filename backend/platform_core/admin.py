from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Tenant, Role, Membership, Subscription, AuditLog, CodeDeployment
@admin.register(User)
class PlatformUserAdmin(UserAdmin):
    ordering = ("email",)
    list_display = ("email", "is_staff", "is_active", "mfa_required")
    fieldsets = UserAdmin.fieldsets + (("Security", {"fields": ("email_verified_at", "mfa_required")}),)
    add_fieldsets = UserAdmin.add_fieldsets + (("Identity", {"fields": ("email",)}),)
for model in (Tenant, Role, Membership, Subscription, AuditLog, CodeDeployment):
    admin.site.register(model)
