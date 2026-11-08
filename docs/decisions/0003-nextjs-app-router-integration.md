# ADR 0003: Next.js App Router integration

- Status: Accepted
- Date: 2026-11-08

## Context

The first-party Next.js application needs direct Client Component calls to NestJS and authenticated Server Component data fetching, while retaining an opaque host-only session cookie.

## Decision

- Client Components call NestJS directly with credentialed fetch and a CSRF token.
- Server Components use a server-only API client that reads the incoming cookie and forwards only that cookie to NestJS.
- Both flows use the same NestJS-managed session and PostgreSQL record.
- Production exposes Next.js and NestJS under one public hostname. A reverse proxy routes \`/v1/*\` to NestJS and other paths to Next.js.
- The cookie remains host-only and uses the \`__Host-\` prefix.
- Local development uses \`localhost\` for both servers on different ports.

## Consequences

- No parent-domain cookie is needed.
- No business API BFF proxy is needed in Next.js.
- Next.js Server Components can authenticate because the browser sends the host-only cookie to the shared public hostname.
- The reverse proxy becomes part of the production network topology and must preserve Cookie and Set-Cookie headers.
- The private server-to-server API URL must be configured separately from the public browser API URL.
- Server Component API calls are uncached and forward only the session cookie.

## Alternatives

- API and web on sibling subdomains with API-host-only cookie: rejected for this SSR flow because the app host never receives the cookie.
- Shared parent-domain cookie: rejected as the default because it expands credential exposure to sibling subdomains.
- Proxy all browser business API requests through Next.js Route Handlers: rejected because direct Client Component → NestJS calls are the intended pattern.
- Custom login bridge that creates a second app-host session: deferred until independent hostnames or separate trust boundaries require it.
