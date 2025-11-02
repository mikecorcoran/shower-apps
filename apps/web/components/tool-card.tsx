import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { ToolEntry } from '@/lib/tools.manifest';
import { getToolIcon } from '@/lib/icon-registry';
import { Badge } from './badge';

export type ToolCardProps = {
  tool: ToolEntry;
};

export function ToolCard({ tool }: ToolCardProps) {
  const Icon = getToolIcon(tool.slug);

  return (
    <Link
      href={{ pathname: '/tools/[slug]', query: { slug: tool.slug } }}
      className={cn(
        'group relative flex flex-col justify-between gap-6 rounded-2xl border border-border/60 bg-white/5 p-6 text-left shadow-sm transition hover:border-primary/60 hover:bg-white/10'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        {tool.status && <Badge>{tool.status}</Badge>}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{tool.title}</h3>
        <p className="text-sm text-muted">{tool.description}</p>
      </div>
      {tool.tags && (
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted transition group-hover:border-primary/40 group-hover:text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
