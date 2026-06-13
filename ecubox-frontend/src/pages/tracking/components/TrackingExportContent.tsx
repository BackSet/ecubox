import { forwardRef } from 'react';
import type { TrackingResolveResponse } from '@/lib/api/tracking.service';
import { computePiezaDisplay } from '@/lib/tracking/trackingDisplayUtils';
import { TrackingSummaryCard } from '@/pages/tracking/components/TrackingSummaryCard';
import { TrackingProgressCard } from '@/pages/tracking/components/TrackingProgressCard';
import { TrackingInsightCard } from '@/pages/tracking/components/TrackingInsightCard';
import { TrackingTimeline } from '@/pages/tracking/components/TrackingTimeline';
import { TrackingDetailsCard } from '@/pages/tracking/components/TrackingDetailsCard';
import { TrackingDespachoCard } from '@/pages/tracking/components/TrackingDespachoCard';
import { TrackingPaquetesDespachoCard } from '@/pages/tracking/components/TrackingPaquetesDespachoCard';
import { TrackingOperadorEntregaCard } from '@/pages/tracking/components/TrackingOperadorEntregaCard';
import { TrackingMasterView } from '@/pages/tracking/components/TrackingMasterView';
import { TrackingPiezasList } from '@/pages/tracking/components/TrackingPiezasList';
import { cn } from '@/lib/utils';

export interface TrackingExportContentProps {
  resolved: TrackingResolveResponse;
  onSelectPieza: (numeroGuia: string) => void;
  whatsapp?: string | null;
  className?: string;
}

export const TrackingExportContent = forwardRef<HTMLDivElement, TrackingExportContentProps>(
  function TrackingExportContent({ resolved, onSelectPieza, whatsapp, className }, ref) {
    const pieza = resolved.tipo === 'PIEZA' ? resolved.pieza ?? null : null;
    const master = resolved.tipo === 'GUIA_MASTER' ? resolved.master ?? null : null;
    const piezaDisplay = pieza ? computePiezaDisplay(pieza) : null;

    if (resolved.tipo === 'GUIA_MASTER' && master) {
      return (
        <div
          ref={ref}
          data-tracking-export-root
          className={cn('mx-auto w-full max-w-[820px] space-y-5', className)}
        >
          <TrackingMasterView master={master} onSelectPieza={onSelectPieza} />
        </div>
      );
    }

    if (!pieza || !piezaDisplay) return null;

    return (
      <div
        ref={ref}
        data-tracking-export-root
        className={cn('mx-auto w-full max-w-[820px]', className)}
      >
        <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            <TrackingSummaryCard
              result={piezaDisplay.pieza}
              fechaFormateada={piezaDisplay.fechaFormateada}
              progress={
                piezaDisplay.progresoDeterminado
                  ? (piezaDisplay.pasoBaseActual / piezaDisplay.totalPasosBase) * 100
                  : 0
              }
              pasoBaseActual={piezaDisplay.pasoBaseActual}
              totalPasosBase={piezaDisplay.totalPasosBase}
              progresoDeterminado={piezaDisplay.progresoDeterminado}
            />
            <TrackingProgressCard
              result={piezaDisplay.pieza}
              totalPasosBase={piezaDisplay.totalPasosBase}
              pasoBaseActual={piezaDisplay.pasoBaseActual}
            />
            <TrackingInsightCard result={piezaDisplay.pieza} whatsapp={whatsapp} />
            <TrackingTimeline
              estados={piezaDisplay.estados}
              currentIndex={piezaDisplay.currentIndex}
            />
            {piezaDisplay.tieneMultiplesPiezas ? (
              <TrackingPiezasList
                piezas={piezaDisplay.piezasHermanas ?? []}
                totalEsperadas={piezaDisplay.totalEsperadasMaster}
                numeroGuiaActual={piezaDisplay.pieza.numeroGuia}
                onSelectPieza={onSelectPieza}
                titulo={
                  piezaDisplay.pieza.master?.trackingBase
                    ? `Otras piezas de la guía ${piezaDisplay.pieza.master.trackingBase}`
                    : 'Otras piezas de esta guía'
                }
              />
            ) : null}
            {piezaDisplay.hasDespachoInfo ? (
              <TrackingDespachoCard result={piezaDisplay.pieza} />
            ) : null}
            {piezaDisplay.hasDespachoInfo && piezaDisplay.hasPaquetesDespacho ? (
              <TrackingPaquetesDespachoCard result={piezaDisplay.pieza} />
            ) : null}
          </div>
          <aside className="space-y-5">
            <TrackingDetailsCard result={piezaDisplay.pieza} />
            {piezaDisplay.hasDespachoInfo && piezaDisplay.hasOperadorEntrega ? (
              <TrackingOperadorEntregaCard result={piezaDisplay.pieza} />
            ) : null}
          </aside>
        </div>
      </div>
    );
  }
);
