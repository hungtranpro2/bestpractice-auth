# Next.js App Router authentication client

This app demonstrates the two supported ways to use the NestJS session API:

1. **Client Components** call NestJS directly using \`fetch\`, \`credentials: 'include'\` and an automatically refreshed CSRF token.
2. **Server Components** read the incoming HttpOnly session cookie and forward only that cookie to NestJS using a server-only API client.

The browser session token is never read by client JavaScript, copied into props, or stored in localStorage.

## Requirements and setup

Node.js 22.12+, npm, PostgreSQL and the NestJS API.

\`\`\`bash
# Terminal 1 — repository root
docker compose up -d postgres

# Terminal 2 — API
cd apps/api
cp .env.example .env
# Set CSRF_SECRET to: openssl rand -hex 32
npm install
npm run prisma:generate
npm run db:migrate:deploy
npm run start:dev

# Terminal 3 — Next.js
cd apps/web
cp .env.example .env.local
npm install
npm run dev
\`\`\`

Open http://localhost:3000. Keep both apps on the hostname \`localhost\`; cookies are scoped to a hostname, not a port. Do not mix \`localhost\` and \`127.0.0.1\`.

## Environment variables

- \`NEXT_PUBLIC_API_BASE_URL\`: Browser API base. Local: \`http://localhost:4000/v1\`. Production behind the same-host reverse proxy: \`/v1\`.
- \`API_INTERNAL_URL\`: Server Component upstream URL. Local: \`http://localhost:4000/v1\`. Production: private service DNS, e.g. \`http://api:4000/v1\`.
- \`SESSION_COOKIE_NAME\`: Must match NestJS; default \`__Host-session\`.

Set \`WEB_ORIGINS=http://localhost:3000\` in the API environment for local development. In production set it to the exact browser origin, e.g. \`https://app.example.com\`.

## Routes

- \`/\`: architecture overview and signed-in state.
- \`/login\`: Client Component login form.
- \`/register\`: Client Component registration form.
- \`/dashboard\`: protected Server Component page, server-rendered profile, Client Component identity check and session manager.

No Next.js Route Handler proxies ordinary business API calls. The only server-side bridge is the read-only, server-only API client used by Server Components.

## Security and deployment topology

The API's \`__Host-session\` cookie is host-only. For a production setup that needs both browser-to-NestJS calls and Server Component SSR without sharing a cookie with sibling subdomains, expose the NestJS API through the **same public hostname** as Next.js:

- Browser: \`https://app.example.com/v1/*\` — reverse proxy routes to NestJS.
- Next.js: \`https://app.example.com/*\`.
- Server Component: calls NestJS on a private address such as \`http://api:4000/v1\` and forwards only \`__Host-session\`.

The reverse proxy does not turn Next.js into a BFF; it is an infrastructure route to NestJS. An example Nginx config is in \`deploy/nginx/app.conf\`.

For local development, Next runs on \`localhost:3000\` and NestJS on \`localhost:4000\`. Browser cookie host scope ignores ports, and the API allows the exact frontend Origin via credentialed CORS.

## Commands

\`\`\`bash
npm run typecheck
npm test
npm run build
npm run start
\`\`\`

The API remains the authentication and authorization authority. A UI redirect is not access control; every protected resource must still be guarded by NestJS.
