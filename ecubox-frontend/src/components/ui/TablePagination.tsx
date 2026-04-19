import { useId } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface TablePaginationProps {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  loading?: boolean;
}

const DEFAULT_SIZES = [10, 25, 50, 100];

/**
 * Paginación reutilizable para listados con backend paginado. Pensado para
 * acompañar al hook `useSearchPagination`. Acepta:
 *  - `page`/`size`/`totalElements`/`totalPages` que normalmente vienen del
 *    `PageResponse<T>` devuelto por el API.
 *  - Callbacks `onPageChange`/`onSizeChange` controlados por el caller.
 *
 * Visualmente: izquierda muestra rango y total ("1–25 de 134"), derecha
 * controla página actual y tamaño.
 */
export function TablePagination({
  page,
  size,
  totalElements,
  totalPages,
  onPageChange,
  onSizeChange,
  pageSizeOptions = DEFAULT_SIZES,
  className,
  loading = false,
}: TablePaginationProps) {
  const sizeSelectId = useId();
  const safeTotalPages = Math.max(1, totalPages);
  const currentPage = Math.min(page, safeTotalPages - 1);
  const start = totalElements === 0 ? 0 : currentPage * size + 1;
  const end = Math.min(totalElements, (currentPage + 1) * size);

  const isFirst = currentPage <= 0;
  const isLast = currentPage >= safeTotalPages - 1;

  return (
    <div
      className={cn(
        'flex flex-col gap-3 border-t border-[var(--color-border)] pt-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      <p className="text-[12.5px] text-[var(--color-muted-foreground)]">
        {totalElements === 0 ? (
          'Sin resultados'
        ) : (
          <>
            Mostrando <span className="font-medium text-foreground">{start.toLocaleString()}</span>
            {start !== end && (
              <>
                {'–'}
                <span className="font-medium text-foreground">{end.toLocaleString()}</span>
              </>
            )}{' '}
            de <span className="font-medium text-foreground">{totalElements.toLocaleString()}</span>
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        {onSizeChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor={sizeSelectId}
              className="text-[12.5px] text-[var(--color-muted-foreground)]"
            >
              Filas
            </label>
            <Select
              value={String(size)}
              onValueChange={(v) => onSizeChange(Number(v))}
              disabled={loading}
            >
              <SelectTrigger id={sizeSelectId} size="sm" className="h-8 w-[78px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((opt) => (
                  <SelectItem key={opt} value={String(opt)}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(0)}
            disabled={loading || isFirst}
            aria-label="Primera página"
          >
            <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={loading || isFirst}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <span className="px-2 text-[12.5px] tabular-nums text-foreground">
            {currentPage + 1} / {safeTotalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={loading || isLast}
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onPageChange(safeTotalPages - 1)}
            disabled={loading || isLast}
            aria-label="Última página"
          >
            <ChevronsRight className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}
