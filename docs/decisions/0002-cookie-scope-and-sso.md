# ADR 0002: Cookie scope and subdomain SSO

- Status: Accepted with deployment-specific choice required
- Date: 2026-11-07

## Context

The example may contain `app.example.com`, `admin.example.com` and `api.example.com`. Cookie Domain and host-only behavior determine which hosts receive a credential.

## Decision

Default to host-only cookies. Do not set a parent Domain merely for convenience.

If multiple independently deployed applications need SSO, prefer a standards-based OpenID Connect authorization-code flow (with PKCE where applicable). Each application establishes its own host-only session after the identity provider redirects back.

A shared parent-domain cookie is allowed only when all subdomains are controlled, secured and operated as one trust boundary, and the risk is explicitly accepted.

## Consequences

- An API-host-only cookie is not sent to the Next.js app host and therefore cannot be read by that app's Server Component.
- If SSR needs authentication, choose one explicit topology: app-host session plus a narrow auth bridge; a trusted parent-domain cookie; or OIDC SSO with app-local sessions.
- Cross-origin browser requests to the API still need `credentials: 'include'` and exact credentialed CORS configuration.
- SameSite and CSRF behavior must be tested in the actual production domain topology.
