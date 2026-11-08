# Testing strategy

## Implemented unit tests

Vitest exercises password hashing, authentication success/failure/disabled accounts, duplicate registration, session hashing and fixation defense, expired/revoked/idle sessions, CSRF HMAC/expiry/session binding, and request guards.

## Implemented E2E tests

Vitest + Supertest with real PostgreSQL and Prisma migrations tests registration, cookie flags, current-user endpoint, session hash storage, CSRF rejection, login session rotation, session listing/revocation, logout replay prevention, and generic login failures.

Run from apps/api after PostgreSQL is started and migrated:

1. npm install
2. npm run prisma:generate
3. npm run db:migrate:deploy
4. npm run typecheck
5. npm test
6. npm run build
7. npm run test:e2e

GitHub Actions API CI provisions PostgreSQL 17 and runs all checks.

## Still required before public production

- Add multi-instance rate limiting with a shared store.
- Add real-browser tests using the deployed HTTPS cookie/domain topology.
- Test concurrency during logout, revocation and session rotation.
- Add tenant/resource authorization tests when those features are implemented.
- Maintain a dependency lockfile and use npm ci in reproducible builds.
- Cover password reset, MFA and OIDC when they become part of the application.

Tests written in the repository are not evidence of successful execution. Check GitHub Actions results and logs before approving the change.
