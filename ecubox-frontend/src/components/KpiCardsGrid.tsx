import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const KPI_CARDS_GRID_CLASS =
  'grid grid-cols-[repeat(auto-fill,minmax(min(100%,13.5rem),1fr))] items-stretch gap-3 sm:gap-4';

interface KpiCardsGridProps extends HTMLAttributes<HTMLDivElement> {}

export function KpiCardsGrid({ className, children, ...props }: KpiCardsGridProps) {
  return (
    <div className={cn(KPI_CARDS_GRID_CLASS, className)} {...props}>
      {children}
    </div>
  );
}
