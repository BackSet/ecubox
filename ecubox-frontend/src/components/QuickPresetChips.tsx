import { cn } from '@/lib/utils';

export interface QuickPresetChipOption<T> {
  label: string;
  value: T;
  disabled?: boolean;
  title?: string;
}

export interface QuickPresetChipsProps<T> {
  options: QuickPresetChipOption<T>[];
  value?: T;
  onSelect: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function QuickPresetChips<T>({
  options,
  value,
  onSelect,
  className,
  size = 'sm',
}: QuickPresetChipsProps<T>) {
  if (options.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={String(option.label)}
            type="button"
            disabled={option.disabled}
            title={option.title}
            onClick={() => onSelect(option.value)}
            aria-pressed={active}
            className={cn(
              'rounded-full border font-medium transition-colors',
              size === 'sm'
                ? 'px-2.5 py-0.5 text-[11px]'
                : 'px-3 py-1 text-xs',
              option.disabled && 'cursor-not-allowed opacity-40',
              active
                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                : 'border-border bg-[var(--color-muted)]/30 text-muted-foreground hover:bg-[var(--color-muted)]/50 hover:text-foreground',
              option.disabled && 'hover:bg-[var(--color-muted)]/30 hover:text-muted-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
