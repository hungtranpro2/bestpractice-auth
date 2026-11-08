import Link from 'next/link';
import { getCurrentUser } from '@/lib/api/server-api';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <main className="hero">
      <div className="hero-copy">
        <div className="section-eyebrow">FULLSTACK AUTHENTICATION PATTERN</div>
        <h1>One session.<br /><span>Two rendering modes.</span></h1>
        <p className="hero-description">
          A practical reference for using NestJS as the authentication authority while
          Next.js App Router renders private data on the server and calls APIs from the browser.
        </p>
        <div className="hero-actions">
          {user ? (
            <Link className="button button-primary" href="/dashboard">Open dashboard</Link>
          ) : (
            <>
              <Link className="button button-primary" href="/login">Sign in</Link>
              <Link className="button button-secondary" href="/register">Create account</Link>
            </>
          )}
        </div>
      </div>
      <div className="architecture-card">
        <div className="architecture-node browser-node">
          <span className="node-label">BROWSER</span>
          <strong>Next.js App Router</strong>
          <small>Client + Server Components</small>
        </div>
        <div className="architecture-arrows">
          <span>CSR · credentials: include</span>
          <span>SSR · forward session cookie</span>
        </div>
        <div className="architecture-node api-node">
          <span className="node-label">AUTHORITY</span>
          <strong>NestJS API</strong>
          <small>CSRF · Guards · Session lifecycle</small>
        </div>
        <div className="architecture-db">PostgreSQL · Prisma</div>
      </div>
    </main>
  );
}