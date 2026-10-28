"""Public submissions and privileged internal review; no email provider required."""

import secrets

from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .inquiry_serializers import PublicInquiryInputSerializer
from .models import AuditLog, PublicInquiry
from .permissions import IsPlatformExecutive, IsPortalAuthenticated


def public_record(record):
    return {
        "id": str(record.pk),
        "kind": record.kind,
        "status": record.status,
        "name": record.name,
        "email": record.email,
        "organization": record.organization,
        "track": record.track,
        "message": record.message,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
    }


class PublicInquirySubmissionView(APIView):
    """Only the Next.js server may submit through this internal API."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        configured = settings.WEBSITE_SUBMISSION_KEY
        if not configured:
            return Response({"detail": "Submission service is not configured."}, status=503)
        supplied = request.headers.get("X-Website-Submission-Key", "")
        if not supplied or not secrets.compare_digest(configured, supplied):
            return Response({"detail": "Submission not authorized."}, status=403)
        serializer = PublicInquiryInputSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"detail": "Please review your form details.", "fields": serializer.errors}, status=400)
        validated = serializer.validated_data
        record = PublicInquiry.objects.create(
            kind=validated["kind"],
            name=validated["name"],
            email=validated["email"],
            organization=validated.get("organization", ""),
            track=validated.get("track", ""),
            message=validated["message"],
        )
        return Response(
            {"ok": True, "reference": str(record.pk)[:8].upper()},
            status=status.HTTP_201_CREATED,
        )


class CompanyInquiryListView(APIView):
    permission_classes = [IsPortalAuthenticated, IsPlatformExecutive]

    def get(self, request):
        queryset = PublicInquiry.objects.order_by("-created_at")
        return Response({
            "total": queryset.count(),
            "inquiries": [public_record(item) for item in queryset[:100]],
        })


class CompanyInquiryDetailView(APIView):
    permission_classes = [IsPortalAuthenticated, IsPlatformExecutive]

    def patch(self, request, pk):
        new_status = request.data.get("status")
        if new_status not in PublicInquiry.Status.values:
            return Response({"detail": "Invalid inquiry status."}, status=400)
        with transaction.atomic():
            record = get_object_or_404(PublicInquiry.objects.select_for_update(), pk=pk)
            old_status = record.status
            if new_status != old_status:
                record.status = new_status
                record.save(update_fields=["status", "updated_at"])
                AuditLog.objects.create(
                    actor=request.user, action="inquiry.status_changed",
                    target_type="public_inquiry", target_id=str(record.pk),
                    metadata={"from": old_status, "to": new_status},
                )
        return Response({"ok": True, "status": record.status})
