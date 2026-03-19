import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';

interface ListTableShellProps {
  children: ReactNode;
  className?: string;
}

export function ListTableShell({ children, className }: ListTableShellProps) {
  return (
    <SurfaceCard className={cn('overflow-hidden p-0', className)}>
      <div className="overflow-x-auto">{children}</div>
    </SurfaceCard>
  );
}
