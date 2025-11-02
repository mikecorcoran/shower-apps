import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: 'default' | 'outline';
};

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        variant === 'default'
          ? 'border-primary/20 bg-primary/12 text-primary'
          : 'border-border/60 bg-background/60 text-muted',
        className
      )}
      {...props}
    />
  );
}
