'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/api/api-client';
import { login, register } from '@/lib/api/auth-client';

type AuthFormProps = { mode: 'login' | 'register' };

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === 'register';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      if (isRegister) {
        await register({ email, password, displayName });
      } else {
        await login({ email, password });
      }
      router.replace('/dashboard');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to connect to the authentication API.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit}>
      {isRegister && (
        <label className="field">
          <span>Display name</span>
          <input
            autoComplete="name"
            maxLength={80}
            required
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Your name"
          />
        </label>
      )}
      <label className="field">
        <span>Email</span>
        <input
          type="email"
          autoComplete="email"
          maxLength={254}
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
        />
      </label>
      <label className="field">
        <span>Password</span>
        <input
          type="password"
          autoComplete={isRegister ? 'new-password' : 'current-password'}
          minLength={isRegister ? 12 : 1}
          maxLength={128}
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder={isRegister ? 'At least 12 characters' : 'Your password'}
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button button-primary button-full" type="submit" disabled={pending}>
        {pending ? 'Please wait…' : isRegister ? 'Create account' : 'Sign in'}
      </button>
      <p className="form-footnote">
        {isRegister ? 'Already have an account? ' : 'New here? '}
        <Link href={isRegister ? '/login' : '/register'}>
          {isRegister ? 'Sign in' : 'Create an account'}
        </Link>
      </p>
    </form>
  );
}