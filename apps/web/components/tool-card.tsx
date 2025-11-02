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
        'group relative flex h-full flex-col gap-6 rounded-[1.6rem] border border-border/60 bg-surface/95 p-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-all duration-200 ease-out hover:-translate-y-1 hover:border-primary/30 hover:shadow-[0_18px_35px_-22px_rgba(79,70,229,0.55)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary/40 motion-reduce:transition-none motion-reduce:hover:translate-y-0'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary">
          <Icon className="h-6 w-6" />
        </div>
        {tool.status && <Badge variant="outline">{tool.status}</Badge>}
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight text-foreground">{tool.title}</h3>
        <p className="text-sm leading-relaxed text-muted">{tool.description}</p>
      </div>
      {tool.tags && (
        <div className="flex flex-wrap gap-2">
          {tool.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted transition-colors duration-150 group-hover:border-primary/30 group-hover:text-foreground/80"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
