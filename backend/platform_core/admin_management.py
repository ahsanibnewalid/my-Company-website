"""Predefined-owner-only company operations API; every mutation is audited."""

import secrets
import uuid

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog, Membership, Project, PublicInquiry, Role, SupportTicket, Tenant, User
from .permissions import IsPlatformExecutive, IsPortalAuthenticated


def record_audit(request, action, target_type, target_id, metadata=None):
    AuditLog.objects.create(
        actor=request.user, action=action, target_type=target_type,
        target_id=str(target_id), metadata=metadata or {},
    )


def tenant_dict(tenant):
    return {
        "id": str(tenant.id), "slug": tenant.slug, "name": tenant.name,
        "status": tenant.status, "plan_code": tenant.plan_code,
    }


def user_dict(user):
    return {
        "id": str(user.id), "email": user.email,
        "name": (user.get_full_name() or user.username),
        "is_active": user.is_active, "is_superuser": user.is_superuser,
        "mfa_required": user.mfa_required,
    }


class OwnerOperation(APIView):
    permission_classes = [IsPortalAuthenticated, IsPlatformExecutive]


class AdminOverviewView(OwnerOperation):
    def get(self, request):
        tenants = Tenant.objects.order_by("-created_at")
        users = User.objects.order_by("-date_joined")
        members = Membership.objects.select_related("user", "tenant", "role").order_by("-created_at")
        return Response({
            "summary": {
                "tenants": tenants.count(), "users": users.count(),
                "projects": Project.objects.count(),
                "open_tickets": SupportTicket.objects.filter(status=SupportTicket.Status.OPEN).count(),
                "new_inquiries": PublicInquiry.objects.filter(status=PublicInquiry.Status.NEW).count(),
            },
            "tenants": [tenant_dict(t) for t in tenants[:100]],
            "users": [user_dict(u) for u in users[:100]],
            "roles": [
                {"code": r.code, "name": r.name, "tier": r.tier}
                for r in Role.objects.order_by("name")
            ],
            "memberships": [
                {"id": str(m.pk), "user_id": str(m.user_id),
                 "email": m.user.email, "tenant_id": str(m.tenant_id),
                 "tenant": m.tenant.name, "role": m.role.code, "is_active": m.is_active}
                for m in members[:100]
            ],
        })


class TenantCreateSerializer(serializers.Serializer):
    name = serializers.CharField(min_length=2, max_length=180, trim_whitespace=True)
    slug = serializers.SlugField(min_length=2, max_length=80)
    plan_code = serializers.SlugField(max_length=40, required=False, default="starter")


class AdminTenantsView(OwnerOperation):
    def post(self, request):
        serializer = TenantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            with transaction.atomic():
                tenant = Tenant.objects.create(**data)
                record_audit(request, "tenant.created", "tenant", tenant.pk)
        except IntegrityError:
            return Response({"detail": "Organization slug already exists."}, status=409)
        return Response(tenant_dict(tenant), status=201)


class AdminTenantDetailView(OwnerOperation):
    def patch(self, request, pk):
        allowed = {"status", "plan_code"}
        if not isinstance(request.data, dict) or not request.data or set(request.data) - allowed:
            return Response({"detail": "Only organization status and plan can be edited."}, status=400)
        if "status" in request.data and request.data["status"] not in Tenant.Status.values:
            return Response({"detail": "Invalid organization status."}, status=400)
        if "plan_code" in request.data and (
            not isinstance(request.data["plan_code"], str)
            or not 1 <= len(request.data["plan_code"]) <= 40
            or not request.data["plan_code"].replace("_", "").replace("-", "").isalnum()
        ):
            return Response({"detail": "Invalid plan code."}, status=400)
        with transaction.atomic():
            tenant = get_object_or_404(Tenant.objects.select_for_update(), pk=pk)
            changes = {}
            for field in allowed & set(request.data):
                if getattr(tenant, field) != request.data[field]:
                    changes[field] = {"from": getattr(tenant, field), "to": request.data[field]}
                    setattr(tenant, field, request.data[field])
            if changes:
                tenant.save(update_fields=[*changes, "updated_at"])
                record_audit(request, "tenant.updated", "tenant", tenant.pk, changes)
        return Response(tenant_dict(tenant))


class UserCreateSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)
    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    tenant_id = serializers.UUIDField()
    role_code = serializers.SlugField(max_length=80)

    def validate_email(self, value):
        return value.strip().lower()


class AdminUsersView(OwnerOperation):
    def post(self, request):
        serializer = UserCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        tenant = get_object_or_404(Tenant, pk=data["tenant_id"], status=Tenant.Status.ACTIVE)
        role = get_object_or_404(Role, code=data["role_code"])
        # Owner privileges are never granted by the browser provisioning workflow.
        if (role.tier.lower().startswith("executive") or role.tier.lower() == "owner") or role.code in {"owner", "ceo"}:
            return Response({"detail": "Owner accounts require private provisioning."}, status=403)
        if User.objects.filter(email__iexact=data["email"]).exists():
            return Response({"detail": "That email already has an account. Assign a membership instead."}, status=409)
        password = secrets.token_urlsafe(30)
        with transaction.atomic():
            user = User.objects.create_user(
                username="member_" + uuid.uuid4().hex[:20],
                email=data["email"], password=password,
                first_name=data.get("first_name", ""), last_name=data.get("last_name", ""),
                mfa_required=not role.code.startswith("client_"),
            )
            Membership.objects.create(user=user, tenant=tenant, role=role)
            record_audit(request, "member.created", "user", user.pk, {
                "tenant_id": str(tenant.pk), "role": role.code,
            })
        return Response({
            "user": user_dict(user),
            "temporary_password": password,
            "notice": "This password is displayed only once. Share it through a private channel."
        }, status=201)


class AdminUserDetailView(OwnerOperation):
    def patch(self, request, pk):
        if not isinstance(request.data, dict) or set(request.data) != {"is_active"} or not isinstance(request.data["is_active"], bool):
            return Response({"detail": "Only account active status can be changed here."}, status=400)
        with transaction.atomic():
            user = get_object_or_404(User.objects.select_for_update(), pk=pk)
            if user.is_superuser or user.pk == request.user.pk:
                return Response({"detail": "Owner accounts cannot be changed here."}, status=403)
            if user.is_active != request.data["is_active"]:
                user.is_active = request.data["is_active"]
                user.save(update_fields=["is_active"])
                record_audit(request, "member.active_changed", "user", user.pk, {
                    "is_active": user.is_active,
                })
        return Response(user_dict(user))


class MembershipCreateSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()
    tenant_id = serializers.UUIDField()
    role_code = serializers.SlugField(max_length=80)


class AdminMembershipsView(OwnerOperation):
    def post(self, request):
        serializer = MembershipCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = get_object_or_404(User, pk=data["user_id"], is_active=True)
        if user.is_superuser:
            return Response({"detail": "Owner memberships are not managed here."}, status=403)
        tenant = get_object_or_404(Tenant, pk=data["tenant_id"], status=Tenant.Status.ACTIVE)
        role = get_object_or_404(Role, code=data["role_code"])
        if role.tier.lower() in {"executive", "owner"} or role.code in {"owner", "ceo"}:
            return Response({"detail": "Cannot assign owner privileges."}, status=403)
        with transaction.atomic():
            if not role.code.startswith("client_") and not user.mfa_required:
                user.mfa_required = True
                user.save(update_fields=["mfa_required"])
            member, created = Membership.objects.update_or_create(
                user=user, tenant=tenant, defaults={"role": role, "is_active": True}
            )
            record_audit(request, "membership.assigned", "membership", member.pk, {
                "tenant_id": str(tenant.pk), "role": role.code, "created": created,
            })
        return Response({"ok": True, "id": str(member.pk)}, status=201 if created else 200)
