from django.core.management.base import BaseCommand
from platform_core.models import Role
ROLES = [
("founder_ceo","Founder & CEO","executive-core",["platform.tenants.read","platform.tenants.manage","deployments.request","deployments.authorize"],True),
("executive_operations","Executive Operations","executive-core",["platform.tenants.read","reports.read"],True),
("board_observer","Board Observer","executive-core",["reports.read"],False),
("senior_faculty_advisor","Senior Faculty Advisor","tech-rnd",["reviews.approve","security.reports.read"],True),
("student_intern","Student Intern","tech-rnd",["sandbox.read","sandbox.write"],False),
("software_engineer","Software Engineer","tech-rnd",["sandbox.read","sandbox.write"],False),
("security_engineer","Security Engineer","tech-rnd",["security.reports.read","security.scans.run"],False),
("qa_engineer","QA Engineer","tech-rnd",["tests.run","tests.read"],False),
("ai_researcher","AI Researcher","tech-rnd",["sandbox.read","sandbox.write"],False),
("product_manager","Product Manager","growth-product-ops",["product.read","product.write","portal.projects.read","portal.projects.manage","portal.tickets.read"],False),
("growth_marketer","Growth Marketer","growth-product-ops",["campaigns.read","campaigns.write"],False),
("customer_success","Customer Success","growth-product-ops",["customers.read","portal.projects.read","portal.tickets.read","portal.tickets.create","portal.tickets.manage"],False),
("sales_manager","Sales Manager","growth-product-ops",["leads.read","leads.write"],False),
("legal_counsel","Legal Counsel","legal-finance",["legal.documents.read"],False),
("finance_manager","Finance Manager","legal-finance",["billing.subscriptions.read","finance.reports.read"],True),
("tax_compliance_officer","Tax Compliance Officer","legal-finance",["finance.tax.read"],False),
("billing_support","Billing Support","legal-finance",["billing.subscriptions.read","portal.tickets.read","portal.tickets.manage"],False),
("platform_sre","Platform SRE","systems-infrastructure",["infra.metrics.read","infra.operate"],True),
("database_administrator","Database Administrator","systems-infrastructure",["db.metrics.read","db.operate"],True),
("incident_commander","Incident Commander","systems-infrastructure",["incidents.read","incidents.manage"],True),
("client_user","Client User","client",["portal.projects.read","portal.tickets.read","portal.tickets.create"],False),
("client_manager","Client Manager","client",["portal.projects.read","portal.tickets.read","portal.tickets.create","billing.subscriptions.read"],False)]
class Command(BaseCommand):
    help = "Idempotently seed the Axiom Labs 20-role catalog."
    def handle(self, *args, **options):
        for code, name, tier, permissions, privileged in ROLES:
            Role.objects.update_or_create(code=code, defaults={"name": name, "tier": tier, "permissions": permissions, "is_privileged": privileged})
        self.stdout.write(self.style.SUCCESS(f"Seeded {len(ROLES)} roles."))
