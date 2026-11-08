# Best Practice Authentication — NestJS + Next.js

Reference architecture for first-party web authentication with Next.js App Router and NestJS.

## Design

- Browser web apps use opaque server-side sessions with an HttpOnly cookie.
- Next.js Client Components call NestJS directly using credentials: 'include'.
- Next.js Server Components will use a server-only API client and a deliberately chosen cookie topology.
- NestJS owns authentication, session lifecycle and authorization.
- PostgreSQL with Prisma 7 is the durable session source of truth.
- JWT bearer authentication may be added as a separate mobile/third-party API profile if needed.

For different trust boundaries across subdomains, use OIDC SSO with host-only sessions rather than sharing a parent-domain cookie by default.

## Current implementation

The NestJS Authentication Core is implemented on the feature branch, including Prisma migrations, Argon2id password hashing, secure session cookies, CSRF/Origin protections, session management endpoints, unit tests and PostgreSQL-backed E2E tests.

[API setup and endpoints](apps/api/README.md)

## Documentation

- [Architecture](docs/architecture.md)
- [API contract](docs/api-contract.md)
- [Security checklist](docs/security-checklist.md)
- [Testing strategy](docs/testing.md)
- [Deployment notes](docs/deployment.md)
- [ADR 0001: Web authentication model](docs/decisions/0001-web-authentication-model.md)
- [ADR 0002: Cookie scope and SSO](docs/decisions/0002-cookie-scope-and-sso.md)

## Caveats

This is a reference implementation, not a completed production audit. Review GitHub Actions results, dependency versions, cookie topology, session fixation behavior, rate limiting, and production secret management before deployment.

Next.js app integration, OIDC SSO, MFA, password reset and resource-level RBAC are not yet implemented.
