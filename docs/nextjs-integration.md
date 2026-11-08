# Next.js App Router integration

## Two request paths, one session

The browser holds one opaque HttpOnly cookie issued by NestJS. PostgreSQL remains the source of truth for session validity.

### Client Components → NestJS directly

Use \`src/lib/api/api-client.ts\`:

- Calls the public API URL (local direct origin or production same-host \`/v1\`).
- Always uses \`credentials: 'include'\`.
- Uses \`cache: 'no-store'\`.
- Obtains a signed CSRF token before every unsafe HTTP method.
- Caches the CSRF token briefly and shares an in-flight token request.
- Invalidates the cached token after login/register/logout because the token is bound to the current session cookie.

Business API calls are not proxied through Next.js Route Handlers.

### Server Components → NestJS

Use \`src/lib/api/server-api.ts\`:

- Calls \`cookies()\` asynchronously.
- Reads only the configured session cookie.
- Forwards only \`Cookie: __Host-session=...\` to the private NestJS API URL.
- Uses \`cache: 'no-store'\`.
- Returns null on 401 so a protected page can redirect to login.
- Is protected by the \`server-only\` package.

Do not forward all browser headers. Never serialize the cookie value into Client Component props or HTML.

Server Components are read-only. Login/logout cookie changes happen because the browser calls NestJS and receives its Set-Cookie response. A deliberate Next.js Route Handler/Server Action can be added for a future auth bridge, but it is not required by this topology.

## Cookie topology

An API-host-only cookie at \`api.example.com\` is not sent to \`app.example.com\`. A host-only cookie at \`app.example.com\` is sent to both \`https://app.example.com/v1/*\` and the Next.js page host.

Recommended production topology:

\`\`\`text
Browser
  └── https://app.example.com
        ├── /       → Next.js (web:3000)
        └── /v1/*   → NestJS (api:4000)
                         └── PostgreSQL
\`\`\`

The reverse proxy routes requests to NestJS; it does not execute business logic or turn Next.js into an API BFF. NestJS sees the public Origin and validates it against \`WEB_ORIGINS\`. Use HTTPS and keep the cookie host-only with the \`__Host-\` prefix.

Local development can use Next \`http://localhost:3000\` and Nest \`http://localhost:4000\`: cookie host scoping does not include the port. The API CORS allowlist must include \`http://localhost:3000\`. Use the same hostname for both; do not mix \`localhost\` and \`127.0.0.1\`.

## Authorization

The Next.js dashboard performs a server-side redirect when the session is absent or invalid. This is a user-experience boundary only. Every protected data access remains authenticated and authorized by NestJS guards and resource-level policies.

## Build and test

From \`apps/web\`:

\`\`\`bash
npm install
npm run typecheck
npm test
npm run build
\`\`\`
