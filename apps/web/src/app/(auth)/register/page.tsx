import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthForm } from '@/components/auth/auth-form';
import { getCurrentUser } from '@/lib/api/server-api';

export const metadata: Metadata = { title: 'Create account' };
export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect('/dashboard');
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="section-eyebrow">GET STARTED</div>
        <h1>Create account</h1>
        <p className="muted">Create a user and an opaque server-side session.</p>
        <AuthForm mode="register" />
      </section>
    </main>
  );
}