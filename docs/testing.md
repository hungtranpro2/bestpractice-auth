# Testing strategy

Authentication must be tested at unit, integration and end-to-end levels. A passing happy-path login test is not sufficient.

## NestJS unit tests

- Password verification success and failure.
- Session secret generation and hashing.
- Expired, revoked, malformed and unknown session handling.
- Session rotation after login and privilege change.
- Authorization policy and resource ownership checks.
- CSRF token validation and Origin allowlist behavior.
- Rate-limit behavior and generic login errors.

Mock external boundaries (repository, clock, mail provider, rate limiter) rather than mocking the logic under test.

## NestJS integration tests

Use a real test database (or disposable container) for transaction and uniqueness behavior:

- Create session, resolve session, revoke session.
- Concurrent logout and authenticated requests.
- User disablement/password reset revocation policy.
- Cookie attributes and clearing behavior.
- CORS preflight and credentialed requests.
- DTO validation and error response contract.

## Next.js tests

- Client API calls include credentials.
- Auth provider handles loading, authenticated and anonymous states without persisting credentials.
- Server API client forwards only the session cookie.
- Server API client does not leak credentials to logs or client bundles.
- User-specific data is not accidentally cached across requests.
- Unauthorized SSR responses are handled safely.

## E2E scenarios

1. Anonymous user cannot access a protected API or page.
2. Valid login sets cookie and returns minimal user data.
3. Reload preserves session.
4. Client Component calls NestJS directly.
5. Server Component calls NestJS with the forwarded session cookie.
6. Invalid CSRF token blocks a state-changing request.
7. Disallowed Origin is rejected.
8. Logout revokes the session; replaying the old cookie fails.
9. Session expiry requires re-authentication.
10. User A cannot read or mutate User B's resources.
11. Session identifier changes after login.
12. Two concurrent requests do not create inconsistent session state.

## Test discipline

Use deterministic clocks and generated test credentials. Never use production secrets or real user data. Assert security properties (cookie flags, no token in JSON, no-store behavior), not only status codes.
