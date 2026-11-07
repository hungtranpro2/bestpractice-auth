# Security checklist

## Credentials and sessions

- [ ] Passwords are hashed with Argon2id using current OWASP-recommended parameters.
- [ ] Login, password reset and verification endpoints are rate limited.
- [ ] Session secrets are generated using a CSPRNG with at least 256 bits of entropy.
- [ ] Store only a hash of the session secret in the database.
- [ ] Rotate session identifier after login and privilege changes to prevent fixation.
- [ ] Enforce idle and absolute session expiry on the server.
- [ ] Revoke sessions on logout, password reset where policy requires, account disablement and security events.
- [ ] Do not log passwords, cookies, session secrets, authorization headers or tokens.

## Cookies, CORS and CSRF

- [ ] Production cookies use HttpOnly and Secure.
- [ ] Prefer host-only cookies; use parent-domain cookies only with an explicit shared trust boundary.
- [ ] Use SameSite=Lax or Strict where product flows permit; SameSite=None requires Secure.
- [ ] Cookie-authenticated state-changing endpoints have CSRF protection.
- [ ] Validate Origin (and, where appropriate, Referer) against an explicit allowlist.
- [ ] Use a synchronizer token or signed double-submit pattern appropriate to the architecture.
- [ ] CORS uses exact origin allowlists and credentials; never wildcard with credentials.
- [ ] CORS is not treated as a CSRF defense.

## Authorization and application security

- [ ] NestJS validates authentication and authorization on every protected API.
- [ ] Deny by default; explicitly mark public endpoints.
- [ ] Check resource ownership and tenant boundaries server-side.
- [ ] Never rely on hidden buttons, client route guards or user-supplied role claims.
- [ ] Apply DTO validation, output minimization, security headers and a suitable CSP.
- [ ] Avoid unsafe HTML rendering and audit third-party scripts.

## SSR and caching

- [ ] Server-side API client forwards only the intended session cookie.
- [ ] Never forward all incoming request headers to an upstream service.
- [ ] Authenticated HTML and user-specific API responses are not shared-cacheable.
- [ ] Use private/no-store caching for sensitive user-specific responses unless a safe cache key and isolation model are proven.
- [ ] Do not put secrets in Server Component props, serialized HTML, logs or error messages.

## Operations

- [ ] HTTPS is enforced end-to-end.
- [ ] Secrets are managed outside source control and rotated.
- [ ] Database and Redis access are network-restricted and authenticated.
- [ ] Audit security events without recording credentials.
- [ ] Dependency updates and vulnerability scanning are automated.
- [ ] Incident response can revoke sessions globally.
