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
      href={`/tools/${tool.slug}`}
      className={cn(
        'group relative flex flex-col justify-between gap-6 rounded-2xl border border-border/60 bg-surface p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-foreground/10 hover:shadow-md'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary">
          <Icon className="h-6 w-6" />
        </div>
        {tool.status && <Badge>{tool.status}</Badge>}
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{tool.title}</h3>
        <p className="text-sm leading-relaxed text-muted">{tool.description}</p>
      </div>
      {tool.tags && (
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/70 bg-background/40 px-2 py-0.5 text-xs text-muted transition group-hover:border-foreground/10 group-hover:text-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
