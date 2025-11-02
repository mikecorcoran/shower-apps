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
        <main className="mx-auto w-full max-w-[70rem] px-5 pb-16 pt-12 sm:px-6 sm:pt-16 lg:px-8">
          {children}
        </main>
        <footer className="border-t border-border/60 bg-surface/95 backdrop-blur">
          <div className="mx-auto flex w-full max-w-[70rem] flex-col items-center gap-2 px-5 py-8 text-center text-sm text-muted sm:px-6 lg:px-8">
            Built with care by Shower Apps.
          </div>
        </footer>
      </body>
    </html>
  );
}
