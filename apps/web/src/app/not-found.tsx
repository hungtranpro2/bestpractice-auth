import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="section-eyebrow">404</div>
        <h1>Page not found</h1>
        <p className="muted">The page you requested does not exist.</p>
        <Link className="button button-primary" href="/">Back home</Link>
      </section>
    </main>
  );
}