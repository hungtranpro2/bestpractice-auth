'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/api-client';
import { logout } from '@/lib/api/auth-client';

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    setPending(true);
    setError('');
    try {
      await logout();
      router.replace('/login');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to sign out.');
      setPending(false);
    }
  }

  return (
    <div className="action-stack">
      <button className="button button-quiet" type="button" onClick={handleLogout} disabled={pending}>
        {pending ? 'Signing out…' : 'Sign out'}
      </button>
      {error && <span className="form-error" role="alert">{error}</span>}
    </div>
  );
}