import { type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Field({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('space-y-2', className)} {...props} />;
}

export function FieldHint({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[0.8rem] text-[var(--color-muted-foreground)]', className)} {...props} />;
}

export function FieldError({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-[0.8rem] font-medium text-[var(--color-destructive)]', className)} {...props} />;
}
