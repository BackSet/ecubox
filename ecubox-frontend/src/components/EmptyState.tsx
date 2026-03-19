import { type LucideIcon, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title = 'Sin resultados',
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[var(--color-border)] bg-[var(--color-muted)]/30 py-12 px-6 text-center',
        className
      )}
    >
      <Icon className="h-10 w-10 text-[var(--color-muted-foreground)]" aria-hidden />
      <h3 className="mt-3 text-sm font-medium text-[var(--color-foreground)]">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
