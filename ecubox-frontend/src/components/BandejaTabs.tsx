import { useMemo, useRef } from 'react';
import type { ComponentType, SVGProps } from 'react';
import { cn } from '@/lib/utils';

type IconType = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

export type BandejaTone = 'neutral' | 'warning' | 'primary' | 'info' | 'danger' | 'success';

export interface BandejaOption<T extends string> {
  value: T;
  label: string;
  /** Contador mostrado junto al label (omitido si es 0 o undefined). */
  count?: number;
  icon?: IconType;
  /** Tono del contador; por defecto neutral. */
  tone?: BandejaTone;
  /** Oculta por completo la opción (p. ej. sin permiso). */
  hidden?: boolean;
  /** Deshabilita la opción sin ocultarla. */
  disabled?: boolean;
  /** aria-label cuando el label visible no es suficientemente descriptivo. */
  accessibleLabel?: string;
}

export interface BandejaTabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: BandejaOption<T>[];
  /** Título de la bandeja activa (lo resuelve el consumidor). Opcional. */
  title?: string;
  /** Descripción de la bandeja activa. Opcional. */
  description?: string;
  /** Ayuda secundaria (más tenue) de la bandeja activa. Opcional. */
  help?: string;
  ariaLabel?: string;
  className?: string;
}

const COUNT_TONE: Record<BandejaTone, string> = {
  neutral: 'bg-[var(--color-muted)] text-muted-foreground',
  warning: 'bg-[var(--color-warning)] text-[var(--color-warning-foreground)]',
  primary: 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]',
  info: 'bg-[color-mix(in_oklab,var(--color-info)_20%,transparent)] text-[color-mix(in_oklab,var(--color-info)_80%,var(--color-foreground))]',
  danger: 'bg-[color-mix(in_oklab,var(--color-destructive)_18%,transparent)] text-[var(--color-destructive)]',
  success: 'bg-[color-mix(in_oklab,var(--color-success)_18%,transparent)] text-[var(--color-success)]',
};

/**
 * Patrón CANÓNICO de "bandejas" de ECUBOX: divide un módulo en universos de
 * trabajo mutuamente excluyentes (p. ej. operativos / todos / en revisión).
 * NO es un filtro (reduce el universo activo), ni un paso (etapa de captura),
 * ni un modo (cambia cómo se ejecuta una herramienta local).
 *
 * Resuelve semántica de pestañas accesible (`tablist`/`tab`, `aria-selected`),
 * navegación por teclado (flechas/Home/End saltando deshabilitadas), contadores
 * con tono, opciones ocultas/deshabilitadas, foco gestionado y, en móvil,
 * scroll horizontal LOCAL del contenedor (nunca overflow de la página).
 *
 * El título/descripción/ayuda de la bandeja activa los resuelve el consumidor y
 * se renderizan integrados debajo de las pestañas.
 */
export function BandejaTabs<T extends string>({
  value,
  onValueChange,
  options,
  title,
  description,
  help,
  ariaLabel = 'Bandejas',
  className,
}: BandejaTabsProps<T>) {
  const visibles = useMemo(() => options.filter((o) => !o.hidden), [options]);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function focusEnDireccion(desde: number, paso: 1 | -1) {
    const n = visibles.length;
    if (n === 0) return;
    for (let i = 1; i <= n; i++) {
      const idx = (desde + paso * i + n * i) % n;
      if (!visibles[idx].disabled) {
        onValueChange(visibles[idx].value);
        refs.current[idx]?.focus();
        return;
      }
    }
  }

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    if (e.key === 'ArrowRight') { e.preventDefault(); focusEnDireccion(index, 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusEnDireccion(index, -1); }
    else if (e.key === 'Home') { e.preventDefault(); focusEnDireccion(-1, 1); }
    else if (e.key === 'End') { e.preventDefault(); focusEnDireccion(0, -1); }
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="tablist"
        aria-label={ariaLabel}
        className={cn(
          'flex min-w-0 gap-1 overflow-x-auto rounded-md border border-border bg-[var(--color-background)] p-0.5',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        )}
      >
        {visibles.map((option, index) => {
          const active = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              ref={(el) => { refs.current[index] = el; }}
              role="tab"
              type="button"
              id={`bandeja-tab-${option.value}`}
              aria-selected={active}
              aria-label={option.accessibleLabel}
              disabled={option.disabled}
              tabIndex={active ? 0 : -1}
              onClick={() => !option.disabled && onValueChange(option.value)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={cn(
                'ui-transition inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-sm font-medium active:scale-[0.98]',
                'disabled:pointer-events-none disabled:opacity-50',
                active
                  ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {Icon && <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              {option.label}
              {option.count != null && option.count > 0 && (
                <span
                  className={cn(
                    'inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
                    active
                      ? 'bg-[color-mix(in_oklab,var(--color-primary-foreground)_25%,transparent)] text-[var(--color-primary-foreground)]'
                      : COUNT_TONE[option.tone ?? 'neutral'],
                  )}
                >
                  {option.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {(title || description || help) && (
        <div className="space-y-0.5">
          {title && <p className="text-sm font-medium text-foreground">{title}</p>}
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
          {help && <p className="text-xs text-muted-foreground/80">{help}</p>}
        </div>
      )}
    </div>
  );
}
