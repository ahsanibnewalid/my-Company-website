from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from platform_core.admin import otp_admin_site
from platform_core.inquiry_views import CompanyInquiryDetailView, CompanyInquiryListView, PublicInquirySubmissionView
from platform_core.auth_views import LoginView, LogoutView
from platform_core.portal_views import PortalOverviewView, ProjectsView, TicketsView, TicketDetailView
from platform_core.views import HealthView, MeView, TenantViewSet, SubscriptionViewSet

router = DefaultRouter()
router.register("tenants", TenantViewSet, basename="tenant")
router.register("subscriptions", SubscriptionViewSet, basename="subscription")

urlpatterns = [
    path("admin/", otp_admin_site.urls),
    path("api/health/", HealthView.as_view()),
    path("api/inquiries/submit/", PublicInquirySubmissionView.as_view()),
    path("api/portal/inquiries/", CompanyInquiryListView.as_view()),
    path("api/portal/inquiries/<uuid:pk>/", CompanyInquiryDetailView.as_view()),
    path("api/", include(router.urls)),
    path("api/auth/token/", LoginView.as_view()),
    path("api/auth/token/refresh/", TokenRefreshView.as_view()),
    path("api/auth/logout/", LogoutView.as_view()),
    path("api/auth/me/", MeView.as_view()),
    path("api/portal/overview/", PortalOverviewView.as_view()),
    path("api/portal/projects/", ProjectsView.as_view()),
    path("api/portal/tickets/", TicketsView.as_view()),
    path("api/portal/tickets/<uuid:pk>/", TicketDetailView.as_view()),
]
