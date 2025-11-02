import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
};

const baseClasses =
  'inline-flex items-center justify-center rounded-full border font-medium tracking-tight transition-all duration-200 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/50 disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:hover:translate-y-0';

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:
    'border-primary/20 bg-primary/12 text-primary shadow-sm hover:-translate-y-[1px] hover:bg-primary/16 hover:shadow-md',
  ghost: 'border-transparent bg-transparent text-muted hover:-translate-y-[1px] hover:text-foreground hover:bg-foreground/5',
  outline:
    'border-border/70 bg-surface/90 text-foreground shadow-sm hover:-translate-y-[1px] hover:border-primary/30 hover:bg-primary/10'
};

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-10 px-5 text-sm',
  lg: 'h-11 px-6 text-base'
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ asChild, className, variant = 'default', size = 'md', ...props }, ref) => {
    const Component = asChild ? Slot : 'button';
    return (
      <Component
        ref={ref}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
