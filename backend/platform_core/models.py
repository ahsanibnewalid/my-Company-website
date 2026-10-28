import uuid
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
class Tenant(models.Model):
    class Status(models.TextChoices):
        PROVISIONING = "provisioning", "Provisioning"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        TERMINATED = "terminated", "Terminated"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=180)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PROVISIONING)
    plan_code = models.CharField(max_length=40, default="starter")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    email_verified_at = models.DateTimeField(null=True, blank=True)
    mfa_required = models.BooleanField(default=True)
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]
class Role(models.Model):
    code = models.SlugField(max_length=80, unique=True)
    name = models.CharField(max_length=120)
    tier = models.CharField(max_length=40)
    description = models.TextField(blank=True)
    permissions = models.JSONField(default=list)
    is_privileged = models.BooleanField(default=False)
class Membership(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="memberships")
    user = models.ForeignKey(User, on_delete=models.PROTECT, related_name="memberships")
    role = models.ForeignKey(Role, on_delete=models.PROTECT, related_name="memberships")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["tenant", "user"], name="uniq_tenant_user_membership")]
        indexes = [models.Index(fields=["tenant", "is_active"]), models.Index(fields=["user", "is_active"])]
class Subscription(models.Model):
    class Status(models.TextChoices):
        TRIAL = "trial", "Trial"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past due"
        CANCELED = "canceled", "Canceled"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="subscriptions")
    provider = models.CharField(max_length=40, blank=True)
    provider_customer_id = models.CharField(max_length=160, blank=True)
    provider_subscription_id = models.CharField(max_length=160, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.TRIAL)
    currency = models.CharField(max_length=3, default="BDT")
    amount_minor = models.PositiveBigIntegerField(default=0)
    period_start = models.DateTimeField(null=True, blank=True)
    period_end = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    class Meta:
        indexes = [models.Index(fields=["tenant", "status"])]
class AuditLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, null=True, blank=True)
    actor = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True)
    action = models.CharField(max_length=120)
    target_type = models.CharField(max_length=100, blank=True)
    target_id = models.CharField(max_length=160, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    session_id_hash = models.CharField(max_length=128, blank=True)
    request_id = models.UUIDField(default=uuid.uuid4, editable=False)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    class Meta:
        indexes = [models.Index(fields=["tenant", "created_at"]), models.Index(fields=["actor", "created_at"])]
class CodeDeployment(models.Model):
    class Status(models.TextChoices):
        REQUESTED = "requested", "Requested"
        VALIDATING = "validating", "Validating"
        APPROVED = "approved", "Approved"
        DEPLOYED = "deployed", "Deployed"
        REJECTED = "rejected", "Rejected"
        FAILED = "failed", "Failed"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    commit_sha = models.CharField(max_length=40)
    release_tag = models.CharField(max_length=120)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.REQUESTED)
    requested_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="deployment_requests")
    faculty_approved_by = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name="faculty_approvals")
    ceo_signature_verified = models.BooleanField(default=False)
    signature_key_fingerprint = models.CharField(max_length=128, blank=True)
    environment = models.CharField(max_length=20, default="production")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class Project(models.Model):
    class Status(models.TextChoices):
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "Active"
        ON_HOLD = "on_hold", "On hold"
        COMPLETED = "completed", "Completed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="projects")
    name = models.CharField(max_length=180)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PLANNING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "status"])]


class SupportTicket(models.Model):
    class Status(models.TextChoices):
        OPEN = "open", "Open"
        IN_PROGRESS = "in_progress", "In progress"
        RESOLVED = "resolved", "Resolved"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.PROTECT, related_name="support_tickets")
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="support_tickets")
    subject = models.CharField(max_length=180)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["tenant", "status"])]


class PublicInquiry(models.Model):
    """A public project inquiry or career application, never an account or tenant record."""

    class Kind(models.TextChoices):
        PROJECT = "project", "Project inquiry"
        CAREER = "career", "Career application"

    class Status(models.TextChoices):
        NEW = "new", "New"
        REVIEWING = "reviewing", "Reviewing"
        CLOSED = "closed", "Closed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    kind = models.CharField(max_length=12, choices=Kind.choices)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.NEW)
    name = models.CharField(max_length=100)
    email = models.EmailField(max_length=254)
    organization = models.CharField(max_length=120, blank=True)
    track = models.CharField(max_length=80, blank=True)
    message = models.TextField()
    consent_at = models.DateTimeField(default=timezone.now, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["kind", "-created_at"], name="inquiry_kind_received_idx"),
            models.Index(fields=["status", "-created_at"], name="inquiry_status_received_idx"),
        ]
