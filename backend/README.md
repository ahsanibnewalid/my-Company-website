# Axiom Labs Platform API — Phase 1 and 2 foundation

Django REST Framework/PostgreSQL starter for tenant, subscription, identity, role and audit records. This is a foundation, not a production-readiness claim.

## Local setup

Requires Python 3.12+ and PostgreSQL 15+.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
# Set distinct high-entropy DJANGO_SECRET_KEY and JWT_SIGNING_KEY values.
python manage.py makemigrations platform_core
python manage.py migrate
python manage.py seed_roles
python manage.py createsuperuser
python manage.py runserver
```

Endpoints include `/api/health/`, `/api/auth/token/`, `/api/auth/token/refresh/`, `/api/auth/me/`, MFA setup/verify, read-only tenant and subscription APIs.

## Security limitations before production

- Tenant membership and role permission codes are modeled. Subscription reads use server-side permission checks; tenant listing is superuser-only.
- `tenant_database_context` sets transaction-local `app.tenant_id`. Wrap every tenant-owned ORM operation in this context using a tenant ID already verified against Membership. Never trust a header by itself.
- PostgreSQL RLS migration policies are not included as an auto-applied migration until the generated initial migration exists. Generate and review migrations, then add RLS policies for every tenant-owned table and use a non-owner runtime DB role without `BYPASSRLS`.
- MFA enrollment/verification endpoints exist, but token issuance is not MFA-gated yet. Add a custom token serializer, verified-email flow, recovery codes, lockout, and WebAuthn/hardware-backed CEO authorization.
- Add API and cross-tenant isolation tests, refresh-token reuse tests, immutable audit DB grants/triggers/WORM export, CI scanners, secret management, backups and restore drills before production.
- Never expose production credentials, live database access or payment secrets to intern environments.
- Currency amounts use integer minor units and BDT default. Bangladesh tax handling must be validated by qualified local counsel/accountants; no tax advice is encoded here.
