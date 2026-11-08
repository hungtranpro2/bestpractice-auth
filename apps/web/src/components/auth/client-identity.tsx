'use client';

import { useEffect, useState } from 'react';
import { apiRequest, ApiError } from '@/lib/api/api-client';
import type { User } from '@/lib/api/auth-client';

export function ClientIdentity() {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    apiRequest<{ user: User }>('/auth/me')
      .then((result) => {
        if (!active) return;
        setUser(result.user);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setStatus('error');
        if (cause instanceof ApiError && cause.status === 401) {
          setUser(null);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="client-identity">
      <div className="section-eyebrow">CLIENT COMPONENT · DIRECT API CALL</div>
      {status === 'loading' && <p className="muted">Loading identity from NestJS…</p>}
      {status === 'ready' && <p>Authenticated as <strong>{user?.email}</strong></p>}
      {status === 'error' && <p className="muted">Could not refresh identity from the API.</p>}
    </div>
  );
}