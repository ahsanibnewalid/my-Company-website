from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from platform_core.views import HealthView, MeView, TenantViewSet, SubscriptionViewSet, MFASetupView, MFAVerifyView
from platform_core.stakeholder_api import FacultyReviewQueueView, InternWorkspaceView, FleetMetricsView, CEOReleaseAuthorizationView
router = DefaultRouter()
router.register("tenants", TenantViewSet, basename="tenant")
router.register("subscriptions", SubscriptionViewSet, basename="subscription")
urlpatterns = [path("admin/", admin.site.urls), path("api/health/", HealthView.as_view()), path("api/auth/token/", TokenObtainPairView.as_view()), path("api/auth/token/refresh/", TokenRefreshView.as_view()), path("api/auth/me/", MeView.as_view()), path("api/auth/mfa/setup/", MFASetupView.as_view()), path("api/auth/mfa/verify/", MFAVerifyView.as_view()), path("api/faculty/reviews/", FacultyReviewQueueView.as_view()), path("api/intern/workspaces/", InternWorkspaceView.as_view()), path("api/owner/fleet-metrics/", FleetMetricsView.as_view()), path("api/owner/release-authorization/", CEOReleaseAuthorizationView.as_view()), path("api/", include(router.urls))]
