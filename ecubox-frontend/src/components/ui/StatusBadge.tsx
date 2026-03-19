import { type HTMLAttributes, forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const statusBadgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium',
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

export interface StatusBadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {}

const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ className, variant, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(statusBadgeVariants({ variant }), className)}
        {...props}
      />
    );
  }
);
StatusBadge.displayName = 'StatusBadge';

export { StatusBadge, statusBadgeVariants };
