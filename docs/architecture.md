# Architecture

## Context and assumptions

This pattern targets a first-party Next.js App Router web application and a NestJS API. Example production origins:

- `https://app.example.com`
- `https://api.example.com`

The browser and API are different origins but, when hosted under the same registrable domain and using HTTPS, are normally same-site. Cross-origin requests still require credentialed CORS.

## Default model: opaque server-side session

The browser receives a cryptographically random session identifier in an HttpOnly cookie. The cookie contains no user profile, roles, JWT, or refresh token. NestJS stores only a hash of the session identifier and resolves it to a server-side session record.

Suggested session fields:

- `id` (internal database identifier)
- `tokenHash` (unique hash of random cookie secret)
- `userId`
- `createdAt`, `lastSeenAt`, `expiresAt`
- `revokedAt`
- optional `userAgentHash`, coarse metadata and rotation lineage

Generate at least 256 bits of randomness using a cryptographically secure random generator. Hash the token with a fast cryptographic hash such as SHA-256 before storage; the original secret is only sent in the cookie. Enforce expiry and revocation server-side.

PostgreSQL (or another durable transactional database) is the source of truth. Redis is optional for cache, rate limiting and distributed coordination; it must not silently become the only durable copy of sessions unless that operational choice is explicit.

## Request flows

### Login

1. Browser sends credentials to NestJS with `credentials: 'include'`.
2. NestJS validates credentials and rate limits attempts.
3. NestJS creates a new session and rotates any pre-authentication session identifier.
4. NestJS sets the session cookie and returns a minimal user representation.
5. Browser navigates or refreshes authenticated UI.

### Client Component API call

1. Client calls the NestJS API directly.
2. Browser attaches the session cookie because the request uses `credentials: 'include'`.
3. NestJS validates session, CSRF requirements (for state-changing requests), and authorization.
4. NestJS returns the resource.

There is no Next.js Route Handler proxy for ordinary business API requests.

### Server Component API call

1. Next.js Server Component reads the incoming session cookie from the request.
2. A server-only API client forwards only the required Cookie header to the NestJS API.
3. NestJS validates the same session and performs authorization.
4. Next.js renders the result.

Do not forward all incoming headers blindly. Never forward browser-supplied `Authorization`, `Host`, hop-by-hop headers, or unrelated cookies. Build the upstream request explicitly. Server Components are read-only with respect to cookies; login/logout and cookie mutation happen in NestJS responses to browser requests, or in a deliberate Route Handler/Server Action if a flow specifically requires it.

### Logout

NestJS revokes the server-side session and clears the cookie using the same Path, Domain and security attributes used when setting it. A client-only cookie deletion is not logout.

## Cookie policy

Production baseline:

- `HttpOnly: true`
- `Secure: true`
- `Path: /`
- `SameSite: Lax` where compatible with the deployment
- Prefer a host-only cookie (omit `Domain`)
- Use a `__Host-` cookie name when host-only requirements are met

If a cookie must be shared across subdomains, it cannot use the `__Host-` prefix and must use a parent `Domain`. Do this only when every receiving subdomain is within the same security trust boundary. A compromised sibling subdomain can otherwise receive the cookie. For independent applications, prefer OIDC SSO with host-only app sessions.

## JWT variant

Use JWT bearer access tokens when a real client requirement exists (mobile, CLI, third-party API consumers, service-to-service). Keep access tokens short-lived and validate signature, allowed algorithm, issuer, audience, expiry and relevant claims. Do not store browser tokens in localStorage/sessionStorage.

Do not add refresh-token rotation, Redis token vaults or a custom token broker to the browser web flow unless the product requirements justify the extra state and operational complexity.
