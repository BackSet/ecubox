import { useState } from 'react';
import {
  Check,
  Clipboard,
  Copy,
  FileDown,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
  Monitor,
  Printer,
  Share2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ExportTile } from '@/components/export/ExportTile';
import type { CotizacionPdfMode } from '@/pages/calculadora/useCotizacionExport';
import type { CompartirResultado } from '@/lib/calculadora/compartirCotizacion';
import type { SnapshotFormat } from '@/lib/exporters/domSnapshot';

export interface CalculadoraActionsBarProps {
  onShare: () => Promise<CompartirResultado>;
  onCopyTexto: () => void | Promise<void>;
  onDownloadPdf: (mode: CotizacionPdfMode) => void | Promise<void>;
  onPrintPdf: (mode: CotizacionPdfMode) => void | Promise<void>;
  onDownloadImage: (format: SnapshotFormat) => void | Promise<void>;
  onCopyImage: () => void | Promise<void>;
  disabled?: boolean;
}

type Pending =
  | 'share'
  | 'copy-texto'
  | 'print-documento'
  | 'print-snapshot'
  | 'pdf-documento'
  | 'pdf-snapshot'
  | 'image-png'
  | 'image-jpeg'
  | 'copy-image'
  | null;

/**
 * Panel "Compartir y exportar" de la calculadora, con la misma UX que el de
 * Rastreo (`TrackingActionsBar`): un botón de compartir + tarjetas de PDF,
 * Imagen e Imprimir con sus variantes. Toda la lógica vive en
 * {@link useCotizacionExport}; este componente es presentacional.
 */
export function CalculadoraActionsBar({
  onShare,
  onCopyTexto,
  onDownloadPdf,
  onPrintPdf,
  onDownloadImage,
  onCopyImage,
  disabled = false,
}: CalculadoraActionsBarProps) {
  const [pending, setPending] = useState<Pending>(null);
  const [shareFeedback, setShareFeedback] = useState<'copied' | null>(null);
  const [copiado, setCopiado] = useState(false);

  const run = async (id: Pending, fn: () => void | Promise<void>) => {
    if (pending && pending !== id) return;
    setPending(id);
    try {
      await fn();
    } finally {
      setPending(null);
    }
  };

  const runShare = async () => {
    if (pending) return;
    setPending('share');
    setShareFeedback(null);
    try {
      const result = await onShare();
      if (result === 'copied') {
        setShareFeedback('copied');
        window.setTimeout(() => setShareFeedback(null), 2000);
      }
    } finally {
      setPending(null);
    }
  };

  const runCopyTexto = async () => {
    if (pending) return;
    setPending('copy-texto');
    try {
      await onCopyTexto();
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1800);
    } finally {
      setPending(null);
    }
  };

  const isPending = (id: Pending) => pending === id;

  return (
    <section className="surface-card space-y-5 p-5 sm:p-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Compartir y exportar
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Comparte la cotización o guárdala como documento. Los valores son los que ves arriba.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Compartir
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            className="h-10 justify-center gap-2 sm:min-w-[11rem]"
            disabled={disabled || isPending('share')}
            onClick={() => void runShare()}
          >
            {isPending('share') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : shareFeedback === 'copied' ? (
              <Check className="h-4 w-4 text-[var(--color-success)]" />
            ) : (
              <Share2 className="h-4 w-4" />
            )}
            {shareFeedback === 'copied' ? 'Copiada al portapapeles' : 'Compartir cotización'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-10 justify-center gap-2"
            disabled={disabled || isPending('copy-texto')}
            onClick={() => void runCopyTexto()}
          >
            {isPending('copy-texto') ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : copiado ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copiado ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Exportar documento
        </p>
        <div className="grid grid-cols-1 gap-2.5">
          <ExportTile
            icon={<FileText className="h-4 w-4" />}
            title="PDF"
            subtitle="Documento o vista de pantalla"
            disabled={disabled}
            pending={isPending('pdf-documento') || isPending('pdf-snapshot')}
            menu={
              <>
                <DropdownMenuLabel className="text-xs">Formato del PDF</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={disabled || Boolean(pending)}
                  onClick={() => void run('pdf-documento', () => onDownloadPdf('documento'))}
                  className="gap-2.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-sm font-medium">Documento</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Texto seleccionable, ideal para archivo.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={disabled || Boolean(pending)}
                  onClick={() => void run('pdf-snapshot', () => onDownloadPdf('snapshot'))}
                  className="gap-2.5"
                >
                  <Monitor className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-sm font-medium">Como en pantalla</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Réplica visual de la cotización.
                    </p>
                  </div>
                </DropdownMenuItem>
              </>
            }
            onPrimary={() => void run('pdf-documento', () => onDownloadPdf('documento'))}
          />

          <ExportTile
            icon={<ImageIcon className="h-4 w-4" />}
            title="Imagen"
            subtitle="PNG, JPEG o portapapeles"
            disabled={disabled}
            pending={
              isPending('image-png') || isPending('image-jpeg') || isPending('copy-image')
            }
            menu={
              <>
                <DropdownMenuLabel className="text-xs">Formato de imagen</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={disabled || Boolean(pending)}
                  onClick={() => void run('image-png', () => onDownloadImage('png'))}
                  className="gap-2.5"
                >
                  <FileImage className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">PNG (alta calidad)</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Sin pérdida, ideal para web.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={disabled || Boolean(pending)}
                  onClick={() => void run('image-jpeg', () => onDownloadImage('jpeg'))}
                  className="gap-2.5"
                >
                  <FileDown className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">JPEG (más liviano)</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Tamaño reducido para mensajería.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={disabled || Boolean(pending)}
                  onClick={() => void run('copy-image', onCopyImage)}
                  className="gap-2.5"
                >
                  <Clipboard className="h-4 w-4 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Copiar al portapapeles</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Pega la imagen donde necesites.
                    </p>
                  </div>
                </DropdownMenuItem>
              </>
            }
            onPrimary={() => void run('image-png', () => onDownloadImage('png'))}
          />

          <ExportTile
            icon={<Printer className="h-4 w-4" />}
            title="Imprimir"
            subtitle="Documento o vista de pantalla"
            disabled={disabled}
            pending={isPending('print-documento') || isPending('print-snapshot')}
            menu={
              <>
                <DropdownMenuLabel className="text-xs">Modo de impresión</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={disabled || Boolean(pending)}
                  onClick={() => void run('print-documento', () => onPrintPdf('documento'))}
                  className="gap-2.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-sm font-medium">Documento</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Comprobante estructurado para archivo.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={disabled || Boolean(pending)}
                  onClick={() => void run('print-snapshot', () => onPrintPdf('snapshot'))}
                  className="gap-2.5"
                >
                  <Monitor className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-sm font-medium">Como en pantalla</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Imprime la cotización tal como se ve.
                    </p>
                  </div>
                </DropdownMenuItem>
              </>
            }
            onPrimary={() => void run('print-documento', () => onPrintPdf('documento'))}
          />
        </div>
      </div>
    </section>
  );
}
