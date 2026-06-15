import { useRef } from 'react';
import { cn } from '@/lib/utils';

export interface BandejaTabDef<T extends string> {
  value: T;
  label: string;
  count?: number;
  /** Tono del contador; por defecto neutral. */
  tone?: 'neutral' | 'warning' | 'primary' | 'info';
}

interface BandejaTabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  tabs: BandejaTabDef<T>[];
  ariaLabel?: string;
  className?: string;
}

const COUNT_TONE: Record<NonNullable<BandejaTabDef<string>['tone']>, string> = {
  neutral: 'bg-[var(--color-muted)] text-muted-foreground',
  warning: 'bg-[var(--color-warning)] text-[var(--color-warning-foreground)]',
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
  info: 'bg-[color-mix(in_oklab,var(--color-info)_20%,transparent)] text-[color-mix(in_oklab,var(--color-info)_80%,var(--color-foreground))]',
};

/**
 * Tabs de bandeja con semántica accesible (`tablist`/`tab`), contadores y
 * navegación por teclado (flechas). En móvil el contenedor permite scroll
 * horizontal local (no produce overflow de página) y mantiene los labels
 * legibles. El panel asociado lo renderiza el consumidor.
 */
export function BandejaTabs<T extends string>({
  value,
  onChange,
  tabs,
  ariaLabel = 'Bandejas',
  className,
}: BandejaTabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') {
      return;
    }
    e.preventDefault();
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    else if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = tabs.length - 1;
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'flex min-w-0 gap-1 overflow-x-auto rounded-md border border-border bg-[var(--color-background)] p-0.5',
        '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
    >
      {tabs.map((tab, index) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => { refs.current[index] = el; }}
            role="tab"
            type="button"
            id={`bandeja-tab-${tab.value}`}
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              'ui-transition inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium active:scale-[0.98]',
              active
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
            {tab.count != null && tab.count > 0 && (
              <span
                className={cn(
                  'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                  active
                    ? 'bg-[color-mix(in_oklab,var(--color-primary-foreground)_25%,transparent)] text-[var(--color-primary-foreground)]'
                    : COUNT_TONE[tab.tone ?? 'neutral'],
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
