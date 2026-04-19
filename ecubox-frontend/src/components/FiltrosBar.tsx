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
}

/**
 * Contenedor estandar para la zona de filtros de una pagina de listado.
 *
 * Estructura visual: tarjeta con borde sutil y fondo `bg-card`. Si se proveen
 * tanto chips como filtros, se separan con un `border-t`. El boton "Limpiar
 * filtros" se inyecta automaticamente al final de la fila de filtros (o, si no
 * hay filtros, al final de la fila de chips) para mantener un solo lugar de
 * reset.
 */
export function FiltrosBar({
  chips,
  filtros,
  hayFiltrosActivos,
  onLimpiar,
  className,
}: FiltrosBarProps) {
  if (!chips && !filtros) return null;

  const limpiarBtn = hayFiltrosActivos && onLimpiar && (
    <Button
      type="button"
      variant="ghost"
      onClick={onLimpiar}
      className="ml-auto h-9 gap-1.5 whitespace-nowrap"
    >
      <X className="h-3.5 w-3.5 shrink-0" />
      <span>Limpiar filtros</span>
    </Button>
  );

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-3',
        className,
      )}
    >
      {chips && (
        <div className="flex flex-wrap items-center gap-2">
          {chips}
          {!filtros && limpiarBtn}
        </div>
      )}
      {filtros && (
        <div
          className={cn(
            'flex flex-wrap items-end gap-3',
            chips && 'border-t border-border pt-3',
          )}
        >
          {filtros}
          {limpiarBtn}
        </div>
      )}
    </div>
  );
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
  /** Ancho fijo en clase Tailwind, por defecto `w-[14rem]`. */
  width?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={htmlFor}
        className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
      </label>
      <div className={cn(width ?? 'w-[14rem]')}>{children}</div>
    </div>
  );
}
