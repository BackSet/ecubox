import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Filter, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SurfaceCard } from '@/components/ui/surface-card';
import { ChipFiltro, ChipFiltroGroup } from '@/components/ChipFiltro';

export const FILTROS_GRID_CLASS =
  'grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(min(100%,12.5rem),1fr))]';

export interface FiltrosBarProps {
  chips?: ReactNode;
  filtros?: ReactNode;
  hayFiltrosActivos?: boolean;
  onLimpiar?: () => void;
  className?: string;
  chipRowEnd?: ReactNode;
  sinSeparadorChipsFiltros?: boolean;
  resumen?: ReactNode;
  filtrosActivosCount?: number;
}

function hasRenderableContent(node: ReactNode): boolean {
  if (node == null || node === false) return false;
  if (Array.isArray(node)) {
    return node.some((child) => hasRenderableContent(child));
  }
  if (!isValidElement(node)) return true;

  if (node.type === ChipFiltro) {
    const props = node.props as {
      hideWhenZero?: boolean;
      active?: boolean;
      count?: number;
    };
    if (props.hideWhenZero && !props.active && props.count === 0) return false;
    return true;
  }

  if (node.type === ChipFiltroGroup || node.type === Fragment) {
    const children = Children.toArray((node.props as { children?: ReactNode }).children);
    return children.some((child) => hasRenderableContent(child));
  }

  return true;
}

export function FiltrosBar({
  chips,
  filtros,
  hayFiltrosActivos,
  onLimpiar,
  className,
  chipRowEnd,
  sinSeparadorChipsFiltros,
  resumen,
  filtrosActivosCount,
}: FiltrosBarProps) {
  const hasChips = hasRenderableContent(chips);
  const hasFiltros = hasRenderableContent(filtros);

  if (!hasChips && !hasFiltros) return null;

  const showLimpiar = hayFiltrosActivos && onLimpiar;
  const activeCount = filtrosActivosCount ?? (hayFiltrosActivos ? 1 : 0);

  const limpiarBtn = showLimpiar && (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onLimpiar}
      className="h-9 w-full shrink-0 gap-1.5 whitespace-nowrap sm:w-auto"
    >
      <X className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
      <span>Limpiar filtros</span>
    </Button>
  );

  const chipScrollClass = cn(
    'flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]',
    'md:flex-wrap md:overflow-x-visible',
  );

  const chipsOnly = hasChips && !hasFiltros;
  const combined = hasChips && hasFiltros;

  const chipRowMeta =
    chipsOnly && (resumen || chipRowEnd || limpiarBtn) ? (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {resumen && (
          <p className="text-[12px] text-[var(--color-muted-foreground)]">{resumen}</p>
        )}
        {chipRowEnd}
        {limpiarBtn}
      </div>
    ) : chipRowEnd ? (
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {chipRowEnd}
      </div>
    ) : null;

  return (
    <SurfaceCard className={cn('overflow-hidden p-0', className)}>
      {hasChips && (
        <div
          className={cn(
            'flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3',
            combined && !sinSeparadorChipsFiltros && 'border-b border-[var(--color-border)]',
          )}
        >
          <div className={chipScrollClass}>{chips}</div>
          {chipRowMeta}
        </div>
      )}

      {hasFiltros && (
        <div
          className={cn(
            'px-3 py-3',
            combined && sinSeparadorChipsFiltros && 'pt-0',
          )}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Filter
                className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="text-[13px] font-medium text-[var(--color-foreground)]">
                {combined ? 'Filtros avanzados' : 'Filtros'}
              </span>
              {activeCount > 0 && (
                <span className="inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--color-primary)] px-1.5 text-[11px] font-semibold tabular-nums text-[var(--color-primary-foreground)]">
                  {activeCount}
                </span>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {resumen && (
                <p className="text-[12px] text-[var(--color-muted-foreground)]">{resumen}</p>
              )}
              {limpiarBtn && <div className="hidden sm:block">{limpiarBtn}</div>}
            </div>
          </div>

          <div className={FILTROS_GRID_CLASS}>
            {filtros}
            {limpiarBtn && <div className="flex items-end sm:hidden">{limpiarBtn}</div>}
          </div>
        </div>
      )}
    </SurfaceCard>
  );
}

function controlWidthClass(width?: string): string {
  if (width) return cn('w-full min-w-0', width);
  return 'w-full min-w-0';
}

export function FiltroCampo({
  label,
  htmlFor,
  width,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  width?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-[12px] font-medium leading-none text-[var(--color-muted-foreground)]"
      >
        {label}
      </label>
      <div className={controlWidthClass(width)}>{children}</div>
      {hint && (
        <p className="text-[11px] leading-snug text-[var(--color-muted-foreground)]/80">
          {hint}
        </p>
      )}
    </div>
  );
}
