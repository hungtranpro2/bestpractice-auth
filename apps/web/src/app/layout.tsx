import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Best Practice Auth',
    template: '%s · Best Practice Auth',
  },
  description: 'Next.js App Router with NestJS opaque server-side sessions.',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="site-shell">
          <header className="site-header">
            <a className="brand" href="/">BP<span>Auth</span></a>
            <span className="header-note">NEXT.JS APP ROUTER + NESTJS</span>
          </header>
          {children}
          <footer className="site-footer">
            <span>Opaque sessions · PostgreSQL · HttpOnly cookies</span>
            <span>Reference implementation</span>
          </footer>
        </div>
      </body>
    </html>
  );
}