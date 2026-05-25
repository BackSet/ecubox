import { cn } from '@/lib/utils';
import { onKeyDownNumericDecimal } from '@/lib/inputFilters';

export type PesoInputSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<PesoInputSize, { root: string; input: string; unit: string }> = {
  sm: {
    root: 'h-7',
    input: 'px-1 text-[11px]',
    unit: 'w-6 text-[9px]',
  },
  md: {
    root: 'h-9',
    input: 'px-2.5 text-sm',
    unit: 'w-9 text-[11px]',
  },
  lg: {
    root: 'h-11',
    input: 'px-3 text-base',
    unit: 'w-10 text-xs',
  },
};

const pairSizeClasses: Record<
  PesoInputSize,
  { wrap: string; field: string; input: string; unit: string; root: string }
> = {
  sm: {
    wrap: 'w-fit max-w-[9.75rem] rounded-md shadow-none',
    field: 'w-[4.75rem] shrink-0',
    root: 'h-7',
    input: 'w-[2.85rem] shrink-0 px-1 text-[11px]',
    unit: 'w-[1.65rem] shrink-0 text-[9px] tracking-normal',
  },
  md: {
    wrap: 'w-full max-w-sm rounded-lg',
    field: 'min-w-0 flex-1',
    root: 'h-9',
    input: 'px-2.5 text-sm',
    unit: 'w-9 text-[11px]',
  },
  lg: {
    wrap: 'w-full rounded-lg',
    field: 'min-w-0 flex-1',
    root: 'h-11',
    input: 'px-3 text-base',
    unit: 'w-10 text-xs',
  },
};

export interface PesoInputProps {
  value: string;
  onChange: (value: string) => void;
  unit: 'lbs' | 'kg';
  ariaLabel: string;
  highlight?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  size?: PesoInputSize;
  className?: string;
  placeholder?: string;
}

export function PesoInput({
  value,
  onChange,
  unit,
  ariaLabel,
  highlight,
  invalid,
  disabled,
  size = 'md',
  className,
  placeholder = '0.00',
}: PesoInputProps) {
  const s = sizeClasses[size];

  return (
    <div
      className={cn(
        'group/peso flex min-w-[6.5rem] items-stretch overflow-hidden rounded-md border border-border bg-background shadow-sm transition-[border-color,box-shadow]',
        'focus-within:border-[var(--color-primary)]/50 focus-within:ring-2 focus-within:ring-[var(--color-primary)]/15',
        highlight && 'border-[var(--color-success)]/40 bg-[var(--color-success)]/[0.03]',
        invalid && 'border-[var(--color-destructive)] focus-within:ring-[var(--color-destructive)]/20',
        disabled && 'cursor-not-allowed opacity-60',
        s.root,
        className,
      )}
    >
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => onKeyDownNumericDecimal(e, value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent font-mono tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50',
          'text-right focus:ring-0',
          s.input,
        )}
      />
      <span
        className={cn(
          'flex shrink-0 items-center justify-center border-l border-border font-semibold uppercase tracking-wide',
          'bg-[var(--color-muted)]/35 text-muted-foreground transition-colors',
          'group-focus-within/peso:border-[var(--color-primary)]/20 group-focus-within/peso:bg-[var(--color-primary)]/10 group-focus-within/peso:text-[var(--color-primary)]',
          s.unit,
        )}
      >
        {unit}
      </span>
    </div>
  );
}

export interface PesoInputPairProps {
  lbs: string;
  kg: string;
  onLbsChange: (value: string) => void;
  onKgChange: (value: string) => void;
  lbsAriaLabel?: string;
  kgAriaLabel?: string;
  highlight?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  size?: PesoInputSize;
  className?: string;
  showHint?: boolean;
}

function PesoInputPairField({
  value,
  onChange,
  unit,
  ariaLabel,
  disabled,
  size,
  placeholder,
  roundedClass,
}: {
  value: string;
  onChange: (value: string) => void;
  unit: 'lbs' | 'kg';
  ariaLabel: string;
  disabled?: boolean;
  size: PesoInputSize;
  placeholder?: string;
  roundedClass?: string;
}) {
  const s = pairSizeClasses[size];

  return (
    <div className={cn('flex items-stretch', s.root, s.field, roundedClass)}>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => onKeyDownNumericDecimal(e, value)}
        placeholder={placeholder ?? (size === 'sm' ? '0' : '0.00')}
        aria-label={ariaLabel}
        className={cn(
          'min-w-0 flex-1 border-0 bg-transparent font-mono tabular-nums text-foreground outline-none placeholder:text-muted-foreground/50',
          'text-right focus:ring-0',
          s.input,
        )}
      />
      <span
        className={cn(
          'flex shrink-0 items-center justify-center border-l border-border/80 font-semibold uppercase tracking-wide',
          'bg-[var(--color-muted)]/25 text-muted-foreground',
          s.unit,
        )}
      >
        {unit}
      </span>
    </div>
  );
}

export function PesoInputPair({
  lbs,
  kg,
  onLbsChange,
  onKgChange,
  lbsAriaLabel = 'Peso en libras',
  kgAriaLabel = 'Peso en kilogramos',
  highlight,
  invalid,
  disabled,
  size = 'md',
  className,
  showHint = false,
}: PesoInputPairProps) {
  const pair = pairSizeClasses[size];

  return (
    <div className={cn('space-y-1', className)}>
      <div
        className={cn(
          'group/peso-pair flex overflow-hidden border border-border bg-background transition-[border-color,box-shadow]',
          pair.wrap,
          size === 'sm' ? 'shadow-none focus-within:ring-1' : 'shadow-sm focus-within:ring-2',
          'focus-within:border-[var(--color-primary)]/50 focus-within:ring-[var(--color-primary)]/15',
          highlight && 'border-[var(--color-success)]/40 bg-[var(--color-success)]/[0.03]',
          invalid && 'border-[var(--color-destructive)] focus-within:ring-[var(--color-destructive)]/20',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        <PesoInputPairField
          value={lbs}
          onChange={onLbsChange}
          unit="lbs"
          ariaLabel={lbsAriaLabel}
          disabled={disabled}
          size={size}
          roundedClass="rounded-l-[calc(var(--radius)-1px)]"
        />
        <span
          aria-hidden
          className="w-px shrink-0 self-stretch bg-border/80 group-focus-within/peso-pair:bg-[var(--color-primary)]/25"
        />
        <PesoInputPairField
          value={kg}
          onChange={onKgChange}
          unit="kg"
          ariaLabel={kgAriaLabel}
          disabled={disabled}
          size={size}
          roundedClass="rounded-r-[calc(var(--radius)-1px)]"
        />
      </div>
      {showHint && (
        <p className="text-[10px] text-muted-foreground">
          Escribe en una unidad; la otra se calcula automáticamente.
        </p>
      )}
    </div>
  );
}
