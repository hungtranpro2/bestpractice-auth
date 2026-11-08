import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ClientIdentity } from '@/components/auth/client-identity';
import { LogoutButton } from '@/components/auth/logout-button';
import { SessionManager } from '@/components/auth/session-manager';
import { getCurrentSessions, getCurrentUser } from '@/lib/api/server-api';

export const metadata: Metadata = { title: 'Dashboard' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // These calls execute on the server. The raw session cookie is never a Client Component prop.
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const sessions = await getCurrentSessions();
  if (!sessions) redirect('/login');

  return (
    <main className="dashboard">
      <section className="welcome-panel">
        <div>
          <div className="section-eyebrow">SERVER COMPONENT · SSR AUTHENTICATION</div>
          <h1>Welcome, {user.displayName || user.email}</h1>
          <p className="muted">
            This identity was loaded on the server by forwarding only the HttpOnly session cookie to NestJS.
          </p>
          <div className="user-chip">{user.email}</div>
        </div>
        <LogoutButton />
      </section>

      <div className="two-column">
        <section className="panel">
          <div className="section-eyebrow">SERVER COMPONENT</div>
          <h2>Server-rendered identity</h2>
          <p className="muted">The page called GET /v1/auth/me before HTML was returned.</p>
          <dl className="profile-list">
            <div><dt>User ID</dt><dd>{user.id}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Display name</dt><dd>{user.displayName || '—'}</dd></div>
          </dl>
        </section>
        <section className="panel">
          <ClientIdentity />
          <p className="muted">This panel independently calls GET /v1/auth/me from the browser after hydration.</p>
        </section>
      </div>

      <SessionManager initialSessions={sessions} />
    </main>
  );
}