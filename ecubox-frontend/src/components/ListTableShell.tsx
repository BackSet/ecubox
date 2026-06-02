import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';

interface ListTableShellProps {
  children: ReactNode;
  className?: string;
  /** Altura máxima para tablas largas con cabecera sticky */
  maxHeight?: string;
}

export function ListTableShell({ children, className, maxHeight }: ListTableShellProps) {
  return (
    <SurfaceCard className={cn('overflow-hidden p-0', className)}>
      <div
        className="table-responsive"
        style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
      >
        {children}
      </div>
    </SurfaceCard>
  );
}
