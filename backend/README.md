# Axiom Labs portal API — owner, staff and client access

Django REST Framework API for genuine company accounts, MFA-gated privileged login, tenant memberships, projects, support tickets and audit records. The Next.js frontend communicates through **server-side HTTP-only session cookies**, never exposing JWTs to browser JavaScript.

## Local development

Requires Python 3.12+ and Node 22+. To run locally, Django can use SQLite; production requires PostgreSQL.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
# Replace DJANGO_SECRET_KEY and JWT_SIGNING_KEY with different strong random values.
python manage.py migrate
python manage.py seed_roles
python manage.py createsuperuser
python manage.py enroll_totp --email owner@example.com
python manage.py runserver
```

The last command prints a private OTP enrollment URI. Add it to an authenticator and enter the six-digit code to confirm the device. Use the **actual owner email** chosen when creating the superuser. Never commit the URI, seed, or code.

In another terminal, run `npm install && npm run dev` from the repository root, then visit `http://localhost:3000/login`. In development, the frontend defaults to `http://127.0.0.1:8000` for the API.

### Create a client or staff account

Create a tenant using the TOTP-protected Django admin at `http://localhost:8000/admin/` (mark it **active**). Then:

```bash
python manage.py provision_member --email client@example.com --tenant northstar --role client_user
python manage.py provision_member --email colleague@example.com --tenant northstar --role customer_success
python manage.py enroll_totp --email colleague@example.com
```

The member command prompts for a validated password without placing it in shell history. It never stores an example/default password. Staff roles require authenticator enrollment. The admin can manage real tenants, memberships, projects, and user records through the OTP-protected Django admin.

### Roles and boundaries

- **Owner/CEO:** a Django superuser with confirmed TOTP. The website portal shows overall counts and owner-approved project/support actions; the Django admin manages identities and memberships.
- **Staff:** assigned to a tenant and seeded functional role. Only listed permissions are honored; for example, customer success can work on support tickets and product management can create projects.
- **Client:** explicitly assigned to an active tenant with `client_user` or `client_manager`. Can view permitted projects and create support requests. Client manager can see billing data through the separate authorized subscription API; no payments are processed.

Backend authorization checks the session's identity, active membership, role permissions and target tenant on every API operation. Passing a different `X-Tenant-ID` does not grant access. Direct API calls without a valid Bearer token are rejected.

## Run security tests

```bash
python manage.py check
python manage.py test platform_core -v 2
```

GitHub Actions checks authentication, TOTP enforcement and tenant scoping. The initial model migration must be committed before production deployment; the CI workflow temporarily generates it while verifying the first implementation.

## Production activation — required

1. Provision an independent PostgreSQL database and durable backups.
2. Deploy the Django backend with `DJANGO_DEBUG=false`, distinct high-entropy signing secrets, `DATABASE_URL`, correct `DJANGO_ALLOWED_HOSTS`, and HTTPS.
3. Apply reviewed migrations, seed roles, create the owner superuser and enroll TOTP through a private management console.
4. Configure the Next.js hosting service with `DJANGO_API_URL=https://<your-api-host>`. Never use a `NEXT_PUBLIC_` prefix for the API credential path.
5. Confirm cookie delivery, sign-in, logout, token refresh, tenant isolation, and project/ticket flows on the deployment.
6. Put managed edge rate limits, logs/alerting, backup restores, user invitation/reset processes, token pruning, and a reviewable privacy policy in place before real customers.

The backend is **not automatically deployed** by the frontend's Render blueprint because no production database or host credentials have been supplied. Never use temporary SQLite for production accounts.

### Security boundaries still requiring infrastructure

- Backend permissions enforce object- and tenant-level scoping, but database-level PostgreSQL RLS policies are **not yet deployed**. Add owner-bypass-safe policies, a restricted runtime DB role, and isolation tests at the DB layer before calling the SaaS multi-tenant isolation complete.
- Rate limiting defaults to a Django process-local cache; use a shared cache or managed edge limiter in production.
- Email invitations, account self-service recovery, WebAuthn/hardware MFA, detailed privacy retention, and financial-provider integration require separate configured services and policy.
- Audit records are persisted but not cryptographically immutable. Privileged access needs operational review.
