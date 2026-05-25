import { cn } from '@/lib/utils';
import {
  formatWeightInline,
  formatWeightKg,
  formatWeightLbs,
  normalizeWeight,
} from '@/lib/utils/weight';

export const PESO_TABLE_HEAD_CLASS =
  'w-[9.5rem] min-w-[9.5rem] text-right whitespace-nowrap';

export const PESO_TABLE_CELL_CLASS =
  'text-right align-middle whitespace-nowrap tabular-nums';

export interface PesoCellProps {
  pesoLbs?: number | null;
  pesoKg?: number | null;
  variant?: 'inline' | 'stacked';
  align?: 'left' | 'right';
  className?: string;
  emptyClassName?: string;
}

export function PesoCell({
  pesoLbs,
  pesoKg,
  variant = 'inline',
  align = 'right',
  className,
  emptyClassName,
}: PesoCellProps) {
  const normalized = normalizeWeight(pesoLbs, pesoKg);

  if (!normalized) {
    return (
      <span className={cn('text-muted-foreground', emptyClassName, className)}>
        —
      </span>
    );
  }

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'whitespace-nowrap tabular-nums text-sm text-foreground',
          className,
        )}
      >
        {formatWeightInline(normalized.lbs, normalized.kg)}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-0.5 leading-tight',
        align === 'right' ? 'items-end' : 'items-start',
        className,
      )}
    >
      <span className="whitespace-nowrap text-sm font-medium tabular-nums text-foreground">
        {formatWeightLbs(normalized.lbs)}
      </span>
      <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
        {formatWeightKg(normalized.kg)}
      </span>
    </div>
  );
}
