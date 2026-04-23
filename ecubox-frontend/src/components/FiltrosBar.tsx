import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FiltrosBarProps {
  /** Fila superior opcional con chips rapidos. */
  chips?: ReactNode;
  /** Fila inferior con dropdowns / comboboxes / inputs de filtro. */
  filtros?: ReactNode;
  /** Cuando es true, renderiza el boton "Limpiar filtros" alineado a la derecha. */
  hayFiltrosActivos?: boolean;
  onLimpiar?: () => void;
  className?: string;
  /**
   * Con `chips`, contenido opcional a la derecha de la fila de chips (p. ej. contador).
   * Si no hay `filtros`, el boton Limpiar se coloca en esta misma banda junto a `chipRowEnd`.
   */
  chipRowEnd?: ReactNode;
  /** Si hay `chips` y `filtros`, omite el separador entre ambas filas (misma banda visual). */
  sinSeparadorChipsFiltros?: boolean;
}

/**
 * Contenedor estandar para la zona de filtros de una pagina de listado.
 *
 * Estructura visual: tarjeta con borde sutil y fondo `bg-card`. Si se proveen
 * tanto chips como filtros, se separan con un `border-t`. El boton "Limpiar
 * filtros" se inyecta automaticamente al final de la fila de filtros (o, si no
 * hay filtros, al final de la fila de chips) para mantener un solo lugar de
 * reset.
 *
 * Móvil: chips en fila con scroll horizontal; filtros en grid (1 col &lt;sm,
 * 2 cols sm–lg), cinta flex desde xl.
 *
 * `chipRowEnd`: metadatos a la derecha de la fila de chips (p. ej. contador); con
 * `!filtros`, el Limpiar se agrupa ahí. `sinSeparadorChipsFiltros`: evita la
 * línea entre chips y filtros cuando deben verse como una sola sección.
 */
export function FiltrosBar({
  chips,
  filtros,
  hayFiltrosActivos,
  onLimpiar,
  className,
  chipRowEnd,
  sinSeparadorChipsFiltros,
}: FiltrosBarProps) {
  if (!chips && !filtros) return null;

  const limpiarBtn = hayFiltrosActivos && onLimpiar && (
    <Button
      type="button"
      variant="ghost"
      onClick={onLimpiar}
      className="h-9 w-full shrink-0 gap-1.5 whitespace-nowrap sm:w-auto"
    >
      <X className="h-3.5 w-3.5 shrink-0" />
      <span>Limpiar filtros</span>
    </Button>
  );

  const chipScrollClass = cn(
    '-mx-0.5 flex min-w-0 flex-1 flex-nowrap items-center gap-2 overflow-x-auto px-0.5 pb-0.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]',
    'md:flex-wrap md:overflow-x-visible',
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-3',
        className,
      )}
    >
      {chips && chipRowEnd != null && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          <div className={chipScrollClass}>{chips}</div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {chipRowEnd}
            {!filtros && limpiarBtn}
          </div>
        </div>
      )}
      {chips && chipRowEnd == null && (
        <div className={chipScrollClass}>
          {chips}
          {!filtros && limpiarBtn && (
            <div className="ml-auto shrink-0">{limpiarBtn}</div>
          )}
        </div>
      )}
      {filtros && (
        <div
          className={cn(
            chips && !sinSeparadorChipsFiltros && 'border-t border-border pt-3',
          )}
        >
          <div
            className={cn(
              'grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-end',
              'xl:flex xl:flex-wrap xl:items-end xl:gap-3',
            )}
          >
            {filtros}
            {limpiarBtn && (
              <div className="col-span-full flex justify-stretch pt-0.5 sm:col-span-1 sm:justify-self-end sm:pt-0 xl:ml-auto xl:w-auto xl:flex-initial xl:justify-end">
                {limpiarBtn}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Clases del control: ancho fluido &lt;xl, ancho fijo en xl+ (Tailwind JIT). */
function controlWidthClass(width?: string): string {
  switch (width) {
    case 'w-[16rem]':
      return 'w-full min-w-0 xl:w-[16rem] xl:max-w-none xl:shrink-0';
    case 'w-[14rem]':
      return 'w-full min-w-0 xl:w-[14rem] xl:max-w-none xl:shrink-0';
    case 'w-[12.5rem]':
      return 'w-full min-w-0 xl:w-[12.5rem] xl:max-w-none xl:shrink-0';
    case 'w-[12rem]':
      return 'w-full min-w-0 xl:w-[12rem] xl:max-w-none xl:shrink-0';
    case 'w-[11.25rem]':
      return 'w-full min-w-0 xl:w-[11.25rem] xl:max-w-none xl:shrink-0';
    case 'w-[10rem]':
      return 'w-full min-w-0 xl:w-[10rem] xl:max-w-none xl:shrink-0';
    default:
      return 'w-full min-w-0 xl:w-[14rem] xl:max-w-none xl:shrink-0';
  }
}

/**
 * Wrapper de un control de filtro con su label en estilo uniforme.
 * Usar como hijo de `<FiltrosBar filtros={...}/>`.
 */
export function FiltroCampo({
  label,
  htmlFor,
  width,
  children,
}: {
  label: string;
  htmlFor?: string;
  /** Ancho fijo desde `xl` (clase Tailwind). Por defecto `w-[14rem]`. */
  width?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <div className={controlWidthClass(width)}>{children}</div>
    </div>
  );
}
