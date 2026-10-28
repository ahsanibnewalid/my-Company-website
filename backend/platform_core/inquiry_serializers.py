from rest_framework import serializers

from .models import PublicInquiry


class PublicInquiryInputSerializer(serializers.Serializer):
    kind = serializers.ChoiceField(choices=PublicInquiry.Kind.choices)
    name = serializers.CharField(min_length=2, max_length=100, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    organization = serializers.CharField(required=False, allow_blank=True, max_length=120)
    track = serializers.ChoiceField(
        choices=["Senior Faculty Advisor", "Junior Student Intern"],
        required=False, allow_blank=True, default="",
    )
    message = serializers.CharField(min_length=20, max_length=4000, trim_whitespace=True)
    consent = serializers.BooleanField()

    def validate_email(self, email):
        return email.strip().lower()

    def validate(self, attrs):
        if attrs["consent"] is not True:
            raise serializers.ValidationError({"consent": "Consent is required."})
        if attrs["kind"] == PublicInquiry.Kind.CAREER and not attrs.get("track"):
            raise serializers.ValidationError({"track": "Choose a valid application track."})
        if attrs["kind"] == PublicInquiry.Kind.PROJECT:
            attrs["track"] = ""
        return attrs
