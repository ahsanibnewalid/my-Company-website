# Axiom Labs — Company Website & Client Portal UI

A responsive Next.js App Router starter for a multi-tenant SaaS company website, built with TypeScript, Tailwind CSS v4 and Lucide icons.

## Included
- Responsive landing page, light/dark theme toggle, CTA navigation and polished glass-inspired interface.
- Multi-tenant SaaS feature overview: tenant isolation, RBAC, subscription tiers and invoice workflow.
- Searchable/filterable functional role explorer with role detail modal.
- Repository protection pipeline walkthrough and Founder Lockout governance policy presentation.
- Separate faculty and student-intern application tracks with client-side validation.
- Client portal login mockup with tenant/workspace field and explicit demo-only messaging.
- Accessibility basics: semantic sections, dialog labels, keyboard-usable buttons and reduced-motion support.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:3000.

## Important production work before launch
This repository currently contains a **frontend UI prototype**, not a production SaaS backend. The forms and login do not send or persist data. Before accepting real clients or applicant data, implement:
1. Authentication via a maintained identity provider or hardened server-side auth; secure sessions, MFA for privileged users and account recovery.
2. Tenant resolution from trusted server-side identity/session claims—not a user-editable tenant ID alone—and tenant scoping on every database read/write.
3. Authorization tests for tenant isolation, RBAC and object-level access; audit logs for privileged actions.
4. Database schema and migrations, input validation on server, rate limiting, CSRF/origin protections as applicable, secure headers and secret management.
5. Subscription lifecycle, payment-provider webhooks with signature verification and idempotency, invoice generation, and reconciliation.
6. Secure application API, privacy notice, retention policy, spam controls and consent before storing candidate submissions.
7. CI workflows for lint, type-check, tests, dependency and static security scanning; protected branches and required human approvals.
8. Production deployment controls: private secrets, least-privilege hosting, backup/restore drills, monitoring, alerting and incident response.

## Brand / legal note
“Axiom Labs” is a placeholder brand for this implementation and should be replaced if it is not your registered/selected company name. The supplied brief names 16 explicit role titles across five departments, although it refers to a 20-role structure; the UI currently displays the exact titles supplied and does not invent four additional roles. Founder details and the Circle 006 / e-TIN status are presented as supplied by the project brief; verify all legal/tax claims and authorization before publishing. No certificate or tax status is independently verified by this code.
