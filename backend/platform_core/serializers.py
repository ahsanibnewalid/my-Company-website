from rest_framework import serializers
from .models import Tenant, Subscription, Membership, User
from .permissions import is_predefined_admin
class TenantSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tenant
        fields = ["id", "slug", "name", "status", "plan_code", "created_at", "updated_at"]
        read_only_fields = fields
class SubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subscription
        fields = ["id", "tenant", "provider", "status", "currency", "amount_minor", "period_start", "period_end", "created_at"]
        read_only_fields = fields
class MeSerializer(serializers.ModelSerializer):
    memberships = serializers.SerializerMethodField()
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "is_owner", "mfa_required", "memberships"]
    is_owner = serializers.SerializerMethodField()
    def get_is_owner(self, user):
        return is_predefined_admin(user)
    def get_memberships(self, user):
        return [{"tenant_id": str(m.tenant_id), "tenant": m.tenant.name, "role": m.role.code, "permissions": m.role.permissions} for m in Membership.objects.select_related("tenant", "role").filter(user=user, is_active=True, tenant__status="active")]
