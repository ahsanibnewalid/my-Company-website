# Intern workspace and AI pair-programming policy

## Branch and environment rules
- Work only in an assigned `feature/intern-<ticket>-<short-name>` branch.
- Pull requests target the integration branch; interns never push directly to protected branches.
- Each workspace uses a disposable, isolated test database populated with synthetic fixtures.
- Production secrets, production database credentials, cloud-admin roles, and payment-gateway credentials are never provisioned to intern accounts or CI jobs running untrusted pull-request code.
- Do not use production customer data in tests, screenshots, logs, prompts, or fixtures.
- A workspace request in the API records intent only. Infrastructure automation must provision the branch/database and enforce network/IAM restrictions independently.

## Local development
1. Install Python 3.12+, create a virtual environment, and install `backend/.[dev]`.
2. Copy `.env.example` to `.env` and use only local development credentials.
3. Run migrations and `python manage.py seed_roles`.
4. Run Django checks, formatting/lint, tests, and security scans before opening a PR.
5. Include tests, screenshots where relevant, migration notes, and rollback considerations in the PR.

## VS Code and AI coding assistants
- Use the repository's approved VS Code extensions and organization-managed GitHub Copilot account only.
- Never paste credentials, private keys, tokens, personal data, production logs, or confidential client code into prompts.
- Treat generated code as untrusted: inspect every diff, add tests, run SAST and dependency checks, and disclose material AI assistance according to the project policy.
- AI output does not replace faculty review or security approval.

## Review and release governance
- A Senior Faculty Advisor reviews the diff and confirms CI/SAST evidence before approving.
- Protected branch rules must require successful CI and the designated faculty review outside this UI/API.
- Production release requires a separate server-side signature verifier bound to the release digest and registered CEO public-key fingerprint. Never upload a private key to the website or API.
