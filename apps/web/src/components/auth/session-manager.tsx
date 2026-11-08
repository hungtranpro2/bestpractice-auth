'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError, apiRequest } from '@/lib/api/api-client';
import { logoutAll, revokeSession, type Session } from '@/lib/api/auth-client';

type Props = { initialSessions: Session[] };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function SessionManager({ initialSessions }: Props) {
  const router = useRouter();
  const [sessions, setSessions] = useState(initialSessions);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest<{ sessions: Session[] }>('/auth/sessions')
      .then((result) => {
        if (active) setSessions(result.sessions);
      })
      .catch((cause: unknown) => {
        if (active && cause instanceof ApiError && cause.status !== 401) {
          setError(cause.message);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleRevoke(session: Session) {
    setPendingId(session.id);
    setError('');
    try {
      await revokeSession(session.id);
      if (session.current) {
        router.replace('/login');
        router.refresh();
        return;
      }
      setSessions((current) => current.filter((item) => item.id !== session.id));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to revoke this session.');
    } finally {
      setPendingId(null);
    }
  }

  async function handleLogoutAll() {
    setPendingId('all');
    setError('');
    try {
      await logoutAll();
      router.replace('/login');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to revoke all sessions.');
      setPendingId(null);
    }
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div>
          <div className="section-eyebrow">SESSION MANAGEMENT</div>
          <h2>Active sessions</h2>
          <p className="muted">Review and revoke browser sessions linked to this account.</p>
        </div>
        <button className="button button-danger-outline" type="button" onClick={handleLogoutAll} disabled={pendingId !== null}>
          {pendingId === 'all' ? 'Revoking…' : 'Sign out everywhere'}
        </button>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {sessions.length === 0 ? (
        <p className="empty-state">No active sessions were returned by the API.</p>
      ) : (
        <ul className="session-list">
          {sessions.map((session) => (
            <li className="session-row" key={session.id}>
              <div className="session-info">
                <div className="session-title">
                  <strong>{session.current ? 'This browser' : 'Other session'}</strong>
                  {session.current && <span className="current-pill">CURRENT</span>}
                </div>
                <span className="muted">Last active {formatDate(session.lastSeenAt)}</span>
                <span className="muted">Expires {formatDate(session.expiresAt)}</span>
              </div>
              <button
                className="button button-quiet"
                type="button"
                onClick={() => handleRevoke(session)}
                disabled={pendingId !== null}
              >
                {pendingId === session.id ? 'Revoking…' : 'Revoke'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}