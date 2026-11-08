import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/auth-form';
import { getCurrentUser } from '@/lib/api/server-api';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="section-eyebrow">WELCOME BACK</div>
        <h1>Sign in</h1>
        <p className="muted">Your session is verified by the NestJS API.</p>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}