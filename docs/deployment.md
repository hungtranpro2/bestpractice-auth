# Deployment notes

## Environment variables

Keep a validated, typed configuration module. Example variable names (values are environment-specific):

- `NODE_ENV`
- `API_PUBLIC_ORIGIN`
- `WEB_ALLOWED_ORIGINS`
- `SESSION_COOKIE_NAME`
- `SESSION_COOKIE_DOMAIN` (omit for host-only cookie)
- `SESSION_IDLE_TTL_SECONDS`
- `SESSION_ABSOLUTE_TTL_SECONDS`
- `DATABASE_URL`
- `REDIS_URL` (optional)
- `TRUST_PROXY` (only when deployed behind a known proxy)

Never commit real values. Provide an `.env.example` with placeholders only.

## Local development

Use HTTPS locally when validating Secure cookies and cross-subdomain behavior. A local setup may use a development-only cookie configuration, but do not copy insecure development flags into production.

## Reverse proxies

Configure trusted proxy hops explicitly. Do not blindly trust arbitrary `X-Forwarded-For`, `X-Forwarded-Proto` or host headers. Ensure the application knows the externally visible HTTPS origin.

## Database and Redis

Database is the durable source of session truth. Add indexes for token hash (unique), user ID and expiry/revocation queries. Define cleanup for expired session records. If Redis is used, set authentication, TLS where applicable, network restrictions, memory policy and monitoring.

## Multiple subdomains

A parent-domain cookie increases the blast radius to all subdomains in its Domain scope. Prefer host-only app cookies and OIDC SSO when apps are independently deployed or have different trust levels. Document every allowed origin and cookie domain for each environment.

## Production readiness

Before launch, verify HTTPS, CORS, CSRF, cookie flags, rate limits, session revocation, log redaction, database backups, monitoring and an incident procedure for global session invalidation.
