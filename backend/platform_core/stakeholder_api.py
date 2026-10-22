from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import AuditLog, FacultyReview, FleetMetric, InternWorkspace, Membership

def membership_for(request, permission_code):
    tenant_id = request.headers.get("X-Tenant-ID")
    if not tenant_id:
        return None
    membership = Membership.objects.select_related("role", "tenant").filter(
        tenant_id=tenant_id, user=request.user, is_active=True, tenant__status="active"
    ).first()
    if not membership or permission_code not in membership.role.permissions:
        return None
    return membership

class FacultyReviewQueueView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        membership = membership_for(request, "reviews.read")
        if not membership:
            return Response({"detail": "Faculty review permission required."}, status=403)
        reviews = FacultyReview.objects.order_by("created_at")[:100]
        return Response([{"id": str(r.id), "repository": r.repository, "pr": r.pull_request_number,
            "head_sha": r.head_sha, "sast_status": r.sast_status, "test_status": r.test_status,
            "decision": r.decision, "created_at": r.created_at} for r in reviews])
    def post(self, request):
        membership = membership_for(request, "reviews.approve")
        if not membership or membership.role.code != "senior_faculty_advisor":
            return Response({"detail": "Senior Faculty Advisor approval required."}, status=403)
        review_id = request.data.get("review_id")
        decision = request.data.get("decision")
        note = str(request.data.get("note", ""))[:5000]
        if decision not in [FacultyReview.Decision.APPROVED, FacultyReview.Decision.CHANGES, FacultyReview.Decision.REJECTED]:
            return Response({"detail": "Invalid review decision."}, status=400)
        review = FacultyReview.objects.filter(pk=review_id).first()
        if not review:
            return Response({"detail": "Review not found."}, status=404)
        if decision == FacultyReview.Decision.APPROVED and (review.sast_status != "passed" or review.test_status != "passed"):
            return Response({"detail": "Approval blocked: SAST and tests must pass."}, status=409)
        review.decision = decision
        review.faculty_reviewer = request.user
        review.review_note = note
        review.reviewed_at = timezone.now()
        review.save(update_fields=["decision", "faculty_reviewer", "review_note", "reviewed_at"])
        AuditLog.objects.create(tenant=membership.tenant, actor=request.user, action="faculty.pr_review", target_type="faculty_review", target_id=str(review.pk), metadata={"decision": decision, "head_sha": review.head_sha})
        return Response({"id": str(review.id), "decision": review.decision})

class InternWorkspaceView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        rows = InternWorkspace.objects.filter(intern=request.user).select_related("tenant").order_by("-created_at")
        return Response([{"id": str(w.id), "tenant": w.tenant.name, "branch_name": w.branch_name,
            "database_label": w.database_label, "status": w.status, "task_title": w.task_title,
            "faculty_feedback": w.faculty_feedback, "production_secrets_access": w.production_secrets_access,
            "live_database_access": w.live_database_access, "payment_gateway_access": w.payment_gateway_access} for w in rows])
    def post(self, request):
        tenant_id = request.data.get("tenant_id")
        branch = str(request.data.get("branch_name", ""))
        task = str(request.data.get("task_title", ""))
        db_label = str(request.data.get("database_label", ""))
        if not branch.startswith("feature/intern-") or not all([tenant_id, task, db_label]):
            return Response({"detail": "Use feature/intern-* and provide tenant, task and sandbox DB label."}, status=400)
        membership = Membership.objects.filter(tenant_id=tenant_id, user=request.user, is_active=True, tenant__status="active").first()
        if not membership or membership.role.code != "student_intern":
            return Response({"detail": "Active intern membership required."}, status=403)
        workspace = InternWorkspace.objects.create(tenant=membership.tenant, intern=request.user, branch_name=branch[:120],
            database_label=db_label[:120], task_title=task[:200], production_secrets_access=False,
            live_database_access=False, payment_gateway_access=False, status=InternWorkspace.Status.REQUESTED)
        AuditLog.objects.create(tenant=membership.tenant, actor=request.user, action="intern.workspace_requested",
            target_type="intern_workspace", target_id=str(workspace.pk), metadata={"branch": workspace.branch_name, "database_label": workspace.database_label})
        return Response({"id": str(workspace.id), "status": workspace.status, "note": "Provisioning must be completed by isolated infrastructure automation."}, status=201)

class FleetMetricsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        if not request.user.is_superuser:
            return Response({"detail": "Platform executive permission required."}, status=403)
        rows = FleetMetric.objects.select_related("tenant").order_by("tenant__name", "-sampled_at")
        latest = {}
        for m in rows:
            latest.setdefault(str(m.tenant_id), {"tenant_id": str(m.tenant_id), "tenant": m.tenant.name,
                "cpu_percent": m.cpu_percent, "ram_percent": m.ram_percent, "db_connections": m.db_connections,
                "db_connection_limit": m.db_connection_limit, "ssl_expires_at": m.ssl_expires_at,
                "sampled_at": m.sampled_at, "source": m.source})
        return Response(list(latest.values()))

class CEOReleaseAuthorizationView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        if not request.user.is_superuser:
            return Response({"detail": "Platform executive permission required."}, status=403)
        # Fail closed until a server-side verifier validates a signed, short-lived challenge
        # against the registered CEO public-key fingerprint and release digest.
        AuditLog.objects.create(actor=request.user, action="deployment.authorization_attempt",
            target_type="release", target_id=str(request.data.get("release_tag", ""))[:120],
            metadata={"result": "blocked_no_signature_verifier"})
        return Response({"detail": "Release blocked: server-side GPG/signature verification is not configured. Never submit a private key to this API."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
