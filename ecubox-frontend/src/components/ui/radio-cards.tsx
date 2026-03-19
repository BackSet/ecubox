import { cn } from '@/lib/utils';

export interface RadioCardOption {
  value: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface RadioCardsProps {
  value: string;
  onValueChange: (value: string) => void;
  options: RadioCardOption[];
  className?: string;
}

export function RadioCards({ value, onValueChange, options, className }: RadioCardsProps) {
  return (
    <div className={cn('grid gap-3 md:grid-cols-3', className)}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onValueChange(opt.value)}
            className={cn(
              'rounded-xl border p-4 text-left transition-all',
              active
                ? 'border-[var(--color-primary)] bg-[color-mix(in_oklab,var(--color-primary)_8%,transparent)] shadow-sm'
                : 'border-[var(--color-border)] bg-[var(--color-card)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-secondary)]/30'
            )}
          >
            <div className="flex items-start gap-2">
              {opt.icon && <span className="mt-0.5 text-[var(--color-primary)]">{opt.icon}</span>}
              <span>
                <span className="block text-sm font-semibold">{opt.title}</span>
                {opt.description && <span className="mt-1 block text-xs text-[var(--color-muted-foreground)]">{opt.description}</span>}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
