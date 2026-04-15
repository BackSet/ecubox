import { type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium',
  {
    variants: {
      variant: {
        active:
          'border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)]',
        completed:
          'border-transparent bg-[var(--color-success)] text-[var(--color-success-foreground)]',
        'in-progress':
          'border-transparent bg-[var(--color-info)] text-[var(--color-info-foreground)]',
        pending:
          'border-transparent bg-[var(--color-warning)] text-[var(--color-warning-foreground)]',
        error:
          'border-transparent bg-[var(--color-error)] text-[var(--color-error-foreground)]',
        inactive:
          'border-transparent bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
      },
    },
    defaultVariants: {
      variant: 'active',
    },
  }
);

export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {}

function StatusBadge({ className, variant, ...props }: StatusBadgeProps) {
  return <span className={cn(statusBadgeVariants({ variant }), className)} {...props} />;
}

export { StatusBadge, statusBadgeVariants };
