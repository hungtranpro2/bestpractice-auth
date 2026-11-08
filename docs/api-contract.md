# Authentication API contract

Endpoints use /v1/auth. The browser reference uses opaque server-side sessions; JWTs and refresh-token rotation are not used for this first-party web flow.

| Method | Endpoint | Purpose | CSRF |
| --- | --- | --- | --- |
| GET | /v1/auth/csrf | Issue token bound to current cookie when present | No |
| POST | /v1/auth/register | Create user and session | Required |
| POST | /v1/auth/login | Validate credentials and replace prior browser session | Required |
| GET | /v1/auth/me | Current user profile | No |
| GET | /v1/auth/sessions | Current user's live sessions | No |
| DELETE | /v1/auth/sessions/:id | Revoke one owned session | Required |
| POST | /v1/auth/logout | Revoke current session and clear cookie | Required |
| POST | /v1/auth/logout-all | Revoke all user sessions and clear current cookie | Required |

All unsafe methods are protected by a global CSRF guard requiring exact trusted Origin and signed CSRF token. CSRF tokens expire after 10 minutes; obtain a fresh token after session rotation.

The register response contains id, email and displayName, not passwordHash. The session credential is only returned as an HttpOnly Set-Cookie header.

Browser clients use fetch with credentials: 'include'. The API CORS configuration allows exact origins and credentials, never wildcard with credentials.

Status codes: 200/201 success, 204 session deletion, 400 validation, 401 unauthenticated/bad login, 403 Origin/CSRF denied, 409 duplicate registration, 429 rate limit.

**Cookie scope:** API-host-only cookies are not forwarded to the Next.js frontend host during SSR. For authenticated SSR choose an app-host auth bridge, a security-reviewed parent-domain cookie within one trusted boundary, or OIDC with separate app sessions.
