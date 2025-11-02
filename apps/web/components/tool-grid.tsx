'use client';

import { useMemo, useState } from 'react';
import { ToolCard } from './tool-card';
import type { ToolEntry } from '@/lib/tools.manifest';

export type ToolGridProps = {
  tools: ToolEntry[];
};

export function ToolGrid({ tools }: ToolGridProps) {
  const [query, setQuery] = useState('');
  const normalized = useMemo(() => query.trim().toLowerCase(), [query]);
  const filtered = useMemo(() => {
    if (!normalized) return tools;
    return tools.filter((tool) =>
      [tool.title, tool.description, ...(tool.tags ?? [])]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalized))
    );
  }, [tools, normalized]);

  return (
    <div className="space-y-8">
      <div>
        <label className="text-xs font-semibold uppercase tracking-[0.14em] text-muted" htmlFor="tool-search">
          Search tools
        </label>
        <input
          id="tool-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name, description, or tag"
          className="mt-3 w-full rounded-full border border-border/60 bg-surface/95 px-4 py-3 text-base text-foreground placeholder:text-muted shadow-sm transition-all duration-150 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/15 motion-reduce:transition-none"
        />
      </div>
      {filtered.length ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="rounded-[1.6rem] border border-dashed border-border/60 bg-surface/95 p-12 text-center text-sm text-muted">
          No tools match that filter yet.
        </div>
      )}
    </div>
  );
}
