import { Copy, FileDown, Image as ImageIcon, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrackingActionsBarProps {
  onShare: () => void;
  onCopyLink: () => void;
  onDownloadImage: () => void;
  onDownloadPdf: () => void;
}

export function TrackingActionsBar({
  onShare,
  onCopyLink,
  onDownloadImage,
  onDownloadPdf,
}: TrackingActionsBarProps) {
  return (
    <section className="surface-card p-5 sm:p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
        Compartir y guardar
      </h3>
      <p className="text-sm text-[var(--color-muted-foreground)]">
        Comparte este seguimiento o descarga una copia para enviarla por otro canal.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
        <Button type="button" variant="outline" className="h-10 justify-start gap-2.5" onClick={onShare}>
          <Share2 className="h-4 w-4" />
          Compartir seguimiento
        </Button>
        <Button type="button" variant="outline" className="h-10 justify-start gap-2.5" onClick={onCopyLink}>
          <Copy className="h-4 w-4" />
          Copiar enlace
        </Button>
        <Button type="button" variant="outline" className="h-10 justify-start gap-2.5" onClick={onDownloadImage}>
          <ImageIcon className="h-4 w-4" />
          Descargar imagen
        </Button>
        <Button type="button" variant="outline" className="h-10 justify-start gap-2.5" onClick={onDownloadPdf}>
          <FileDown className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>
    </section>
  );
}

