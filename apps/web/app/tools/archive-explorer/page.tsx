import { Suspense } from 'react';
import ArchiveExplorerClient from './client';
import { metadata } from './metadata';

export const dynamic = 'force-static';

export default function ArchiveExplorerPage() {
  return (
    <article className="space-y-10">
      <header className="space-y-4">
        <div className="inline-flex items-center rounded-full border border-border/60 px-3 py-1 text-xs uppercase tracking-wide text-muted">
          File utilities
        </div>
        <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{metadata.title as string}</h1>
        <p className="max-w-2xl text-base text-muted sm:text-lg">
          Drop an archive to inspect its folder tree, preview images, and download exactly what you need—without leaving the browser.
        </p>
      </header>
      <Suspense fallback={<div className="rounded-2xl border border-dashed border-border/60 p-12 text-center text-muted">Preparing client…</div>}>
        <ArchiveExplorerClient />
      </Suspense>
    </article>
  );
}
