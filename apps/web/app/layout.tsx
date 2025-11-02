import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { SiteHeader } from '@/components/site-header';

export const metadata: Metadata = {
  title: {
    default: 'Shower Apps',
    template: '%s · Shower Apps'
  },
  description: 'A growing collection of purposeful shower thoughts turned into handy tools.',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-background">
      <body className="min-h-screen bg-background text-foreground">
        <SiteHeader />
        <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-16">{children}</main>
        <footer className="border-t border-border/60 bg-background/70 py-10 text-center text-sm text-muted">
          Built with care by Shower Apps.
        </footer>
      </body>
    </html>
  );
}
