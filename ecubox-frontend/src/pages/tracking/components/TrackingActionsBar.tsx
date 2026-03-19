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
    <section className="surface-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        Acciones
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={onShare}>
          <Share2 className="h-4 w-4" />
          Compartir tracking
        </Button>
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={onCopyLink}>
          <Copy className="h-4 w-4" />
          Copiar enlace
        </Button>
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={onDownloadImage}>
          <ImageIcon className="h-4 w-4" />
          Descargar imagen
        </Button>
        <Button type="button" variant="outline" className="justify-start gap-2" onClick={onDownloadPdf}>
          <FileDown className="h-4 w-4" />
          Descargar PDF
        </Button>
      </div>
    </section>
  );
}

