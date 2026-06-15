import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RecipientShipmentSummaryProps {
  totalGuias?: number | null;
  totalPaquetes?: number | null;
  /** Acción al pulsar «Ver envíos» (navega a /mis-guias?destinatarioId=…). */
  onViewShipments: () => void;
  /**
   * `compact` (móvil / pie de card): CTA a ancho completo bajo los conteos.
   * Por defecto (escritorio): conteos arriba y CTA debajo, alineados a la
   * izquierda con posición estable dentro de su columna.
   */
  compact?: boolean;
  className?: string;
}

/** Representación única de conteos: «12 guías · 9 paquetes». */
export function formatConteosEnvios(totalGuias?: number | null, totalPaquetes?: number | null): string {
  const guias = totalGuias ?? 0;
  const paquetes = totalPaquetes ?? 0;
  return `${guias} guía${guias === 1 ? '' : 's'} · ${paquetes} paquete${paquetes === 1 ? '' : 's'}`;
}

/**
 * Resumen de envíos de un destinatario con CTA «Ver envíos» de posición
 * estable. No se posiciona con hacks absolutos ni depende del wrapping: los
 * conteos y la acción viven en un contenedor propio (columna «Envíos» en
 * escritorio, pie de card en móvil).
 */
export function RecipientShipmentSummary({
  totalGuias,
  totalPaquetes,
  onViewShipments,
  compact = false,
  className,
}: RecipientShipmentSummaryProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm text-foreground tabular-nums">
        {formatConteosEnvios(totalGuias, totalPaquetes)}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 gap-1 px-2 text-xs text-primary hover:text-primary',
          compact ? 'w-full justify-center' : 'w-fit justify-start',
        )}
        onClick={(e) => {
          e.stopPropagation();
          onViewShipments();
        }}
      >
        Ver envíos
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </div>
  );
}
