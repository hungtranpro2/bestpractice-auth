# ADR 0001: Web authentication model

- Status: Accepted as the default reference pattern
- Date: 2026-11-07

## Context

The target is a first-party Next.js App Router web application that calls a NestJS API from both Client Components and Server Components. The design should avoid unnecessary BFF proxying for business APIs and provide reliable logout/revocation.

## Decision

Use opaque server-side sessions in HttpOnly cookies for browser web authentication. Client Components call NestJS directly with credentialed requests. Server Components forward the incoming session cookie through a server-only API client. NestJS owns session validation and authorization.

Use JWT bearer tokens as a separate client profile when mobile, CLI or third-party integrations require them.

## Consequences

Positive:
- Same browser credential works for CSR and SSR when cookie scope/topology is designed correctly.
- Immediate server-side revocation is possible.
- No browser refresh token or localStorage token.
- No custom JWT refresh-token rotation required for the default web flow.

Trade-offs:
- API must maintain session state.
- Cookie-based auth requires CSRF defenses.
- Cookie topology matters when frontend and API use different hosts.
- Database/session-store availability is part of authentication availability.

## Rejected alternatives

- JWT access and refresh tokens in localStorage: rejected due to increased XSS exposure.
- Parent-domain cookie by default: rejected because it expands credential exposure to sibling subdomains.
- Mandatory Next.js BFF for every business API: rejected because the requested default is direct Client-to-NestJS API calls.
- Server-side refresh-token vault plus custom token broker for every web request: rejected as unnecessary complexity for a first-party web app.
