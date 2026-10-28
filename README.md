# Axiom Labs — company website

A responsive **Next.js 15** company website with a public project inquiry form, an application flow for collaborators, an operating-model explorer, and a browser-only owner console preview. The Django API in `backend/` is a separate, unfinished foundation; **it is not connected to the website**.

## What works

- Responsive website, theme toggle, accessible labels, role filtering, release-policy explainer.
- Project requests and career applications are validated in the browser **and on the server**, then emailed to a configured company inbox using the Resend Email API.
- Server-side validation, a bot honeypot, basic per-instance throttling, request size limits, an origin check, and clear delivery failure states.
- Automated validation tests, TypeScript check and Next production build in GitHub Actions.
- A sample-data owner console at `/admin` **only in local development**. Production visitors see a private-workspace notice.

## Run locally

Requires Node.js 22.10+ (Node.js 24 recommended).

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without email settings, the site still renders, but form submissions correctly return a not-configured error; they are never falsely marked as delivered.

## Enable real contact and career email

1. Create a Resend account, verify a sending domain, and create a sending API key.
2. Set the following as **server-side** environment variables in your hosting provider, or in an ignored `.env.local` for local development:

```dotenv
RESEND_API_KEY=your-resend-api-key
INQUIRY_TO_EMAIL=your-company-inbox@example.com
INQUIRY_FROM_EMAIL=Axiom Labs <inquiries@your-verified-domain.example>
```

3. Deploy the Next.js service with `npm run build` and `npm start`. The supplied `render.yaml` declares secret environment variable slots for Render. Use your verified domain and real inbox; the values above are examples and must be replaced.
4. Send a test project inquiry and a test career application; confirm the emails arrive. Check your spam folder and provider delivery logs if not. Configure retention and access rules for emailed submissions.

The public site does **not** store inquiries in a database, create client accounts, charge customers, or accept login passwords. The Resend integration is only activated when all three environment variables exist. Contact data is transmitted to Resend and the configured inbox after users consent.

For higher-volume production use, add a managed rate limiter, CAPTCHA or equivalent abuse protection, monitoring, and a published privacy policy appropriate to actual data handling.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
```

GitHub Actions runs these checks on pull requests and pushes to `main`.

## Role-specific status

| Audience | Current experience | Not yet implemented |
| --- | --- | --- |
| Prospective client | Browse services and submit a project inquiry | Authenticated workspace, project tracking, subscriptions, invoices |
| Faculty / student candidate | Select a track and send an application | Hiring pipeline, secure uploads, candidate accounts |
| Owner / staff | Explore a local dashboard with clearly fictional data; API scaffold in `backend/` | Production RBAC dashboard, audited actions, team invitations, real CRM |

The architecture cards and proposed 16-role operating blueprint describe plans, **not verified deployed controls, signed customers or active employees**. Company-name, legal and Bangladesh tax references require owner confirmation.

## Backend foundation

See [backend/README.md](backend/README.md). The Django REST Framework starter models identity, tenants, memberships, subscriptions and audit logs but needs initial migrations, MFA enforcement on token issuance, tenant-scoped access tests, a hardened deployment, and other controls before serving real customers. Do not expose it as a production authentication service in its current state.

## Launch checklist

- [ ] Confirm brand name, founder details, legal claims and business contact information.
- [ ] Verify the sending domain and configure Resend secrets in Render.
- [ ] Test successful and failed form delivery in the deployed environment.
- [ ] Publish an accurate privacy notice, retention policy, and company contact details.
- [ ] Configure a domain, TLS, logging, availability monitoring, spam protection and backups.
- [ ] Implement audited server-side authentication, MFA and tenant isolation before enabling client or owner accounts.
