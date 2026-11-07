# Authentication API contract

All endpoints are versioned under `/v1/auth` in this reference. Names can be adapted, but semantics should remain stable.

| Method | Endpoint | Purpose | CSRF |
|---|---|---|---|
| POST | `/v1/auth/login` | Validate credentials, create session | Origin validation; login CSRF controls |
| POST | `/v1/auth/logout` | Revoke current session and clear cookie | Required |
| GET | `/v1/auth/me` | Return current user | No state change |
| GET | `/v1/auth/csrf` | Issue/return CSRF token for current anonymous or authenticated context | Bootstrap endpoint |
| GET | `/v1/auth/sessions` | List current user's active sessions | Required auth |
| DELETE | `/v1/auth/sessions/:id` | Revoke one owned session | Required auth + CSRF |
| POST | `/v1/auth/logout-all` | Revoke all sessions for current user | Required auth + CSRF |

## Login

Request:

```json
{ "email": "user@example.com", "password": "..." }
```

Success response body should contain only required client data, for example:

```json
{ "user": { "id": "usr_...", "email": "user@example.com", "displayName": "Example" } }
```

Session credential is delivered only through `Set-Cookie`. Never return the raw session secret in JSON.

## Session cookie

The API sets an opaque random cookie with HttpOnly, Secure, Path and SameSite attributes. Prefer host-only scope. If the frontend and API are on sibling subdomains and the API owns the cookie, the browser sends it to the API host; Next.js SSR on the frontend host will not receive that host-only cookie. Choose deliberately:

1. Use an app-host session cookie and a narrow Next.js auth bridge when SSR requires the browser cookie at the app host; or
2. Use a parent-domain cookie only if all subdomains are equally trusted; or
3. Use OIDC SSO and separate host-only sessions.

Do not claim that an API-host-only cookie is automatically available to the Next.js app host.

## CORS

For browser-to-API calls:

- Allow exact frontend origins; never use wildcard origin with credentials.
- Set `Access-Control-Allow-Credentials: true`.
- Allow required methods and headers only.
- Handle OPTIONS preflight.
- Do not treat CORS as authentication or CSRF protection.

Client request example:

```ts
await fetch(`${API_URL}/v1/auth/me`, {
  credentials: 'include',
  headers: { Accept: 'application/json' },
});
```

## Errors

Use stable machine-readable codes, without leaking whether an account exists:

- `INVALID_CREDENTIALS`
- `UNAUTHENTICATED`
- `SESSION_EXPIRED`
- `CSRF_INVALID`
- `FORBIDDEN`
- `RATE_LIMITED`

Return appropriate HTTP status codes (401, 403, 429) and a consistent response envelope.
