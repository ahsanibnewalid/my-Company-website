"""Server-verified tenant-scoped read/write portal API."""
import uuid
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AuditLog, Membership, Project, Subscription, SupportTicket, Tenant, User


def tenant_id_from_request(request):
    value = request.headers.get("X-Tenant-ID", "")
    try:
        return uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return None


def membership_for(request, tenant_id):
    if not tenant_id:
        return None
    return Membership.objects.select_related("tenant", "role").filter(
        user=request.user, tenant_id=tenant_id,
        is_active=True, tenant__status=Tenant.Status.ACTIVE,
    ).first()


def authorized_tenant(request, permission=None):
    tenant_id = tenant_id_from_request(request)
    if not tenant_id:
        return None, None
    if request.user.is_superuser:
        return Tenant.objects.filter(pk=tenant_id, status=Tenant.Status.ACTIVE).first(), None
    membership = membership_for(request, tenant_id)
    if not membership or (permission and permission not in membership.role.permissions):
        return None, None
    return membership.tenant, membership


class PortalOverviewView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.is_superuser:
            tenants = Tenant.objects.order_by("-created_at")
            return Response({
                "persona": "owner",
                "summary": {
                    "tenants": tenants.count(),
                    "active_tenants": tenants.filter(status=Tenant.Status.ACTIVE).count(),
                    "users": User.objects.count(),
                    "projects": Project.objects.count(),
                    "open_tickets": SupportTicket.objects.filter(status=SupportTicket.Status.OPEN).count(),
                },
                "workspaces": [{
                    "id": str(t.id), "name": t.name, "status": t.status,
                    "plan": t.plan_code, "role": "owner", "permissions": ["*"],
                } for t in tenants[:50]],
            })

        memberships = Membership.objects.select_related("tenant", "role").filter(
            user=request.user, is_active=True, tenant__status=Tenant.Status.ACTIVE,
        ).order_by("tenant__name")
        workspaces = []
        for member in memberships:
            perms = member.role.permissions
            tenant = member.tenant
            workspaces.append({
                "id": str(tenant.pk), "name": tenant.name, "status": tenant.status,
                "plan": tenant.plan_code, "role": member.role.name,
                "role_code": member.role.code, "permissions": perms,
                "projects": Project.objects.filter(tenant=tenant).count() if "portal.projects.read" in perms else None,
                "open_tickets": SupportTicket.objects.filter(
                    tenant=tenant, status=SupportTicket.Status.OPEN
                ).count() if "portal.tickets.read" in perms else None,
            })
        persona = "client" if workspaces and all(
            w["role_code"].startswith("client_") for w in workspaces
        ) else "staff"
        return Response({"persona": persona, "summary": {}, "workspaces": workspaces})


class ProjectsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant, _ = authorized_tenant(request, "portal.projects.read")
        if not tenant:
            return Response({"detail": "Workspace access denied."}, status=403)
        items = Project.objects.filter(tenant=tenant).order_by("-created_at")[:50]
        return Response({"projects": [{
            "id": str(p.pk), "name": p.name, "description": p.description,
            "status": p.status, "updated_at": p.updated_at.isoformat(),
        } for p in items]})

    def post(self, request):
        tenant, _ = authorized_tenant(request, "portal.projects.manage")
        if not tenant:
            return Response({"detail": "Project management permission required."}, status=403)
        name = request.data.get("name")
        description = request.data.get("description", "")
        if not isinstance(name, str) or not 3 <= len(name.strip()) <= 180:
            return Response({"detail": "Project name must be 3–180 characters."}, status=400)
        if not isinstance(description, str) or len(description) > 4000:
            return Response({"detail": "Project description is too long."}, status=400)
        project = Project.objects.create(
            tenant=tenant, name=name.strip(), description=description.strip()
        )
        AuditLog.objects.create(
            tenant=tenant, actor=request.user, action="project.created",
            target_type="project", target_id=str(project.pk),
        )
        return Response({"id": str(project.pk)}, status=201)


class TicketsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        tenant, membership = authorized_tenant(request, "portal.tickets.read")
        if not tenant:
            return Response({"detail": "Workspace access denied."}, status=403)
        qs = SupportTicket.objects.filter(tenant=tenant)
        if membership and "portal.tickets.manage" not in membership.role.permissions:
            qs = qs.filter(created_by=request.user)
        return Response({"tickets": [{
            "id": str(t.pk), "subject": t.subject, "message": t.message,
            "status": t.status, "created_at": t.created_at.isoformat(),
        } for t in qs.order_by("-created_at")[:50]]})

    def post(self, request):
        tenant, membership = authorized_tenant(request, "portal.tickets.create")
        if not tenant:
            return Response({"detail": "Workspace access denied."}, status=403)
        subject, message = request.data.get("subject"), request.data.get("message")
        if not isinstance(subject, str) or not 5 <= len(subject.strip()) <= 180:
            return Response({"detail": "Subject must be 5–180 characters."}, status=400)
        if not isinstance(message, str) or not 10 <= len(message.strip()) <= 4000:
            return Response({"detail": "Message must be 10–4,000 characters."}, status=400)
        ticket = SupportTicket.objects.create(
            tenant=tenant, created_by=request.user,
            subject=subject.strip(), message=message.strip(),
        )
        AuditLog.objects.create(
            tenant=tenant, actor=request.user, action="support.ticket.created",
            target_type="support_ticket", target_id=str(ticket.pk),
        )
        return Response({"id": str(ticket.pk)}, status=201)


class TicketDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        tenant, _ = authorized_tenant(request, "portal.tickets.manage")
        if not tenant:
            return Response({"detail": "Ticket management permission required."}, status=403)
        ticket = get_object_or_404(SupportTicket, pk=pk, tenant=tenant)
        new_status = request.data.get("status")
        if new_status not in SupportTicket.Status.values:
            return Response({"detail": "Invalid status."}, status=400)
        ticket.status = new_status
        ticket.save(update_fields=["status", "updated_at"])
        AuditLog.objects.create(
            tenant=tenant, actor=request.user, action="support.ticket.status_changed",
            target_type="support_ticket", target_id=str(ticket.pk),
            metadata={"status": new_status},
        )
        return Response({"ok": True, "status": new_status})
