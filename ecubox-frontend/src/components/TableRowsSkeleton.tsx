import { TableCell, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TableRowsSkeletonProps {
  /** Número total de columnas (incluye columna de acciones, checkbox, etc). */
  columns: number;
  /** Cuántas filas placeholder pintar. Default: 6. */
  rows?: number;
  /** Clases extras para cada `<TableCell>` (útil para mantener anchos/alineación). */
  cellClassName?: string;
  /**
   * Mapa opcional de clases por índice de columna (0-based). Permite ocultar
   * placeholders en breakpoints donde la columna real está oculta. P. ej.
   * `{ 3: 'hidden md:table-cell' }` para una tabla cuya 4ª columna se oculta
   * en pantallas pequeñas.
   */
  columnClasses?: Record<number, string>;
}

/**
 * Pinta `rows` filas de la tabla con un bloque animado por celda. Pensado
 * para sustituir el patrón `isLoading ? <LoadingState /> : <Tabla />`. Se
 * coloca DENTRO del `<TableBody>` para que el header siga visible y no haya
 * "salto" cuando llegan los datos. La altura por celda imita la altura real
 * de las filas con padding por defecto de shadcn (`py-2.5`).
 */
export function TableRowsSkeleton({
  columns,
  rows = 6,
  cellClassName,
  columnClasses,
}: TableRowsSkeletonProps) {
  // Pequeñas variaciones de ancho para que el placeholder no se vea
  // perfectamente uniforme y comunique mejor "esto se está cargando".
  const widths = ['w-3/5', 'w-4/5', 'w-2/3', 'w-3/4', 'w-1/2', 'w-5/6'];
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={`skeleton-row-${rowIdx}`} className="hover:bg-transparent">
          {Array.from({ length: columns }).map((__, colIdx) => (
            <TableCell
              key={`skeleton-cell-${rowIdx}-${colIdx}`}
              className={cn(cellClassName, columnClasses?.[colIdx])}
            >
              <div
                className={cn(
                  'h-3.5 rounded-md bg-[var(--color-muted)]/70 animate-pulse',
                  widths[(rowIdx + colIdx) % widths.length]
                )}
                aria-hidden
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
      <tr className="sr-only" aria-live="polite">
        <td>Cargando datos...</td>
      </tr>
    </>
  );
}
