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
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-muted" htmlFor="tool-search">
          Search tools
        </label>
        <input
          id="tool-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter by name, description, or tag"
          className="mt-2 w-full rounded-xl border border-border/60 bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted shadow-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>
      {filtered.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tool) => (
            <ToolCard key={tool.slug} tool={tool} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border/60 p-10 text-center text-muted">
          No tools match that filter yet.
        </div>
      )}
    </div>
  );
}
