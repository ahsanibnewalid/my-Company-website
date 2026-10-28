import uuid

from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):
    dependencies = [("platform_core", "0001_initial")]

    operations = [
        migrations.CreateModel(
            name="PublicInquiry",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("kind", models.CharField(choices=[("project", "Project inquiry"), ("career", "Career application")], max_length=12)),
                ("status", models.CharField(choices=[("new", "New"), ("reviewing", "Reviewing"), ("closed", "Closed")], default="new", max_length=12)),
                ("name", models.CharField(max_length=100)),
                ("email", models.EmailField(max_length=254)),
                ("organization", models.CharField(blank=True, max_length=120)),
                ("track", models.CharField(blank=True, max_length=80)),
                ("message", models.TextField()),
                ("consent_at", models.DateTimeField(default=django.utils.timezone.now, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["kind", "-created_at"], name="inquiry_kind_received_idx"),
                    models.Index(fields=["status", "-created_at"], name="inquiry_status_received_idx"),
                ],
            },
        ),
    ]
