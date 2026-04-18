import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';

export type KpiTone = 'neutral' | 'success' | 'warning' | 'danger' | 'primary';

interface KpiCardProps {
  icon: ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  tone?: KpiTone;
  to?: string;
  className?: string;
}

const TONE_ICON_BG: Record<KpiTone, string> = {
  neutral: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  primary: 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
  success: 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]/15 text-[var(--color-warning)]',
  danger: 'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]',
};

const TONE_VALUE_TEXT: Record<KpiTone, string> = {
  neutral: 'text-[var(--color-foreground)]',
  primary: 'text-[var(--color-primary)]',
  success: 'text-[var(--color-success)]',
  warning: 'text-[var(--color-warning)]',
  danger: 'text-[var(--color-destructive)]',
};

export function KpiCard({
  icon,
  label,
  value,
  hint,
  tone = 'neutral',
  to,
  className,
}: KpiCardProps) {
  const inner = (
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          TONE_ICON_BG[tone]
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-medium text-[var(--color-muted-foreground)]">
          {label}
        </p>
        <p className={cn('text-2xl font-semibold leading-tight', TONE_VALUE_TEXT[tone])}>
          {value}
        </p>
        {hint && (
          <p className="mt-0.5 truncate text-[11px] text-[var(--color-muted-foreground)]">
            {hint}
          </p>
        )}
      </div>
      {to && (
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] opacity-0 transition group-hover:opacity-100" />
      )}
    </div>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={cn(
          'group block rounded-lg outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]'
        )}
      >
        <SurfaceCard className={cn('p-4 transition hover:shadow-md', className)}>
          {inner}
        </SurfaceCard>
      </Link>
    );
  }

  return (
    <SurfaceCard className={cn('p-4', className)}>
      {inner}
    </SurfaceCard>
  );
}
