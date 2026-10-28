# Axiom Labs — company website and operations backend

A Next.js 15 public company website with a separate Django REST Framework
operations API for authenticated owner, staff and client workspaces.
The site includes project inquiries and career applications, tenant-scoped
projects and support tickets, and a protected owner review dashboard.

## Public website

- Responsive company pages, role explorer, privacy disclosure, project and career forms.
- Both public forms validate data in Next.js and Django. **No Resend or email
  delivery service is used.**
- Successful submissions are stored in the Django database and receive a
  reference number. The form does not create an account or guarantee a reply.
- Requests are never marked successful when the backend cannot store them.
- A honeypot and basic local throttling reduce automated abuse. Production needs
  managed rate limiting, monitoring, and a verified retention/privacy policy.

## Company backend

- Django auth with JWT access/refresh and MFA for privileged accounts.
- Predefined-owner-only `/admin` login with enforced email allowlist, mandatory TOTP and protected management API; separate staff/client access.
- Owner can create and activate organizations, create member accounts, assign roles, deactivate non-owner accounts and manage project/support/inquiry workflows.
- Staff and client role boundaries; tenant-isolated project/support APIs.
- Public submissions kept separate from client tenants. Only a superuser with
  a valid MFA-verified session can review/change them via the owner portal.
- OTP-protected Django admin for account provisioning, inquiry review and operations.
- PostgreSQL is required for production; local development may use SQLite.

## Local setup

Requires Node.js 22.10+ (24 recommended) and Python 3.12+.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
# Set distinct strong DJANGO_SECRET_KEY and JWT_SIGNING_KEY values.
# Set WEBSITE_SUBMISSION_KEY to a long random private value.
python manage.py migrate
python manage.py seed_roles
# Set ADMIN_ALLOWED_EMAILS in backend/.env to your chosen owner email first.
python manage.py createsuperuser
python manage.py enroll_totp --email YOUR_OWNER_EMAIL
python manage.py runserver
```

In a second terminal, from the repository root:

```bash
npm install
# Put WEBSITE_SUBMISSION_KEY=<the same backend value> in .env.local
npm run dev
```

Open http://localhost:3000 for the public site or
http://localhost:3000/login for staff/client access, or
http://localhost:3000/admin for predefined-owner administration.
Django development defaults to http://127.0.0.1:8000.
See [backend/README.md](backend/README.md) for account/member provisioning
and security details.

## Render deployment

The two components are independent services:

1. The existing `render.yaml` deploys Next.js. Set `DJANGO_API_URL` to
   the HTTPS URL of your separate Django service.
2. The optional `deploy/render-api.yaml` deploys Django. First create a
   managed PostgreSQL database with backups and set `DATABASE_URL`,
   `DJANGO_ALLOWED_HOSTS`, `DJANGO_CSRF_TRUSTED_ORIGINS`,
   `DJANGO_SECRET_KEY`, `JWT_SIGNING_KEY` and `ADMIN_ALLOWED_EMAILS` securely.
3. Set the **same** long, random server-only `WEBSITE_SUBMISSION_KEY` in
   both services. Never expose it through `NEXT_PUBLIC_` variables.
4. Apply migrations (including `0002_publicinquiry`), seed roles, create
   the owner using an email listed in `ADMIN_ALLOWED_EMAILS` and enroll TOTP from a private backend management shell.
5. Verify database health at `/api/health/` on the Django service; verify a
   real public submission and its appearance in the owner portal. Check
   failed submissions do not show a success message.

The frontend blueprint does **not** create the Django service or database.
Do not use an ephemeral SQLite file in production. No default owner
credentials or secrets are committed. Deployment requires real Render
configuration and verification.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
python backend/manage.py makemigrations --check --dry-run
python backend/manage.py test platform_core
```

CI runs frontend and backend checks on pull requests and pushes to main.

## Remaining work before customer launch

- Confirm company legal identity, contact details and published privacy policy.
- Publish an explicit submission retention/deletion workflow and privacy contact.
- Configure durable PostgreSQL backups, monitoring, managed request throttling,
  security alerts, and a user invitation/password recovery process.
- Review all owner/staff roles, tenant boundaries, and production secrets.
- Payments, invoices, hiring workflows and advanced deployment controls remain
  planned—not claimed as operational.
