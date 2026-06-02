import { useRef } from 'react';
import type { TrackingResolveResponse } from '@/lib/api/tracking.service';
import { TrackingExportContent } from '@/pages/tracking/components/TrackingExportContent';
import { TrackingActionsBar } from '@/pages/tracking/components/TrackingActionsBar';
import { useTrackingExport } from '@/pages/tracking/hooks/useTrackingExport';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';

export interface TrackingResultsSectionProps {
  resolved: TrackingResolveResponse;
  codigo: string;
  shareUrl: string;
  onSelectPieza: (numeroGuia: string) => void;
  exportsDisabled?: boolean;
}

export function TrackingResultsSection({
  resolved,
  codigo,
  shareUrl,
  onSelectPieza,
  exportsDisabled = false,
}: TrackingResultsSectionProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const { canales } = usePublicCanalesDisponibles();
  const {
    handleShare,
    handlePrintPdf,
    handleDownloadPdf,
    handleDownloadImage,
    handleCopyImage,
  } = useTrackingExport(exportRef, { resolved, codigo, shareUrl });

  return (
    <section className="space-y-5">
      <div className="grid grid-cols-1 items-start gap-4 sm:gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <TrackingExportContent
          ref={exportRef}
          resolved={resolved}
          onSelectPieza={onSelectPieza}
          whatsapp={canales?.whatsapp}
        />
        <aside className="space-y-5 xl:sticky xl:top-4">
          <TrackingActionsBar
            onShare={handleShare}
            onPrintPdf={handlePrintPdf}
            onDownloadPdf={handleDownloadPdf}
            onDownloadImage={handleDownloadImage}
            onCopyImage={handleCopyImage}
            exportsDisabled={exportsDisabled}
          />
        </aside>
      </div>
    </section>
  );
}
