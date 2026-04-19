import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface FormSkeletonProps {
  /** Cuántos campos pintar. Default: 4. */
  fields?: number;
  /** Si true, pinta una fila de botones al final. Default: true. */
  withFooter?: boolean;
  /** Cantidad de botones del footer. Default: 2. */
  footerButtons?: number;
  /** Si true, pinta un textarea grande al final del formulario. */
  withTextarea?: boolean;
  className?: string;
}

/**
 * Skeleton de formulario genérico: `n` campos `label + input` apilados,
 * opcionalmente seguidos de un textarea y/o footer de botones. Usado en
 * formularios sencillos como `TarifaCalculadoraForm`, paneles de
 * `ParametrosSistemaPage` y wizards.
 */
export function FormSkeleton({
  fields = 4,
  withFooter = true,
  footerButtons = 2,
  withTextarea = false,
  className,
}: FormSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`field-${i}`} className="space-y-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
      {withTextarea && (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-28 w-full" />
        </div>
      )}
      {withFooter && (
        <div className="flex justify-end gap-2 pt-2">
          {Array.from({ length: footerButtons }).map((_, i) => (
            <Skeleton key={`btn-${i}`} className="h-9 w-24" />
          ))}
        </div>
      )}
    </div>
  );
}
