import { useState } from 'react';
import {
  Check,
  ChevronDown,
  Clipboard,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TrackingPdfMode } from '@/pages/tracking/hooks/useTrackingExport';
import { cn } from '@/lib/utils';

export interface TrackingActionsBarProps {
  onShare: () => Promise<'shared' | 'copied' | 'cancelled' | 'failed'>;
  onPrintPdf: (mode: TrackingPdfMode) => void | Promise<void>;
  onDownloadPdf: (mode: TrackingPdfMode) => void | Promise<void>;
  onDownloadImage: (format: 'png' | 'jpeg') => void | Promise<void>;
  onCopyImage: () => void | Promise<void>;
  exportsDisabled?: boolean;
}

type Pending =
  | 'share'
  | 'print-estructurado'
  | 'print-snapshot'
  | 'pdf-estructurado'
  | 'pdf-snapshot'
  | 'image-png'
  | 'image-jpeg'
  | 'copy-image'
  | null;

export function TrackingActionsBar({
  onShare,
  onPrintPdf,
  onDownloadPdf,
  onDownloadImage,
  onCopyImage,
  exportsDisabled = false,
}: TrackingActionsBarProps) {
  const [pending, setPending] = useState<Pending>(null);
  const [shareFeedback, setShareFeedback] = useState<'copied' | null>(null);

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

  const isPending = (id: Pending) => pending === id;

  return (
    <section className="surface-card space-y-5 p-5 sm:p-6" data-export-exclude>
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Compartir y exportar
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Comparte el enlace del rastreo o guárdalo en el portapapeles.
        </p>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Compartir
        </p>
        <Button
          type="button"
          className="h-10 w-full justify-center gap-2 sm:w-auto sm:min-w-[11rem]"
          disabled={isPending('share')}
          onClick={() => void runShare()}
        >
          {isPending('share') ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : shareFeedback === 'copied' ? (
            <Check className="h-4 w-4 text-[var(--color-success)]" />
          ) : (
            <Share2 className="h-4 w-4" />
          )}
          {shareFeedback === 'copied' ? 'Enlace copiado' : 'Compartir enlace'}
        </Button>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Exportar documento
        </p>
        {exportsDisabled ? (
          <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/25 px-3 py-2.5 text-xs text-[var(--color-muted-foreground)]">
            La exportación a PDF o imagen está disponible al consultar un envío real.
          </p>
        ) : null}
        <div className="grid grid-cols-1 gap-2.5">
          <ExportTile
            icon={<FileText className="h-4 w-4" />}
            title="PDF"
            subtitle="Documento o vista de pantalla"
            disabled={exportsDisabled}
            pending={isPending('pdf-estructurado') || isPending('pdf-snapshot')}
            menu={
              <>
                <DropdownMenuLabel className="text-xs">Formato del PDF</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={exportsDisabled || Boolean(pending)}
                  onClick={() => void run('pdf-snapshot', () => onDownloadPdf('snapshot'))}
                  className="gap-2.5"
                >
                  <Monitor className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-sm font-medium">Como en pantalla</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Réplica visual del rastreo web.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportsDisabled || Boolean(pending)}
                  onClick={() => void run('pdf-estructurado', () => onDownloadPdf('estructurado'))}
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
              </>
            }
            onPrimary={() => void run('pdf-snapshot', () => onDownloadPdf('snapshot'))}
          />

          <ExportTile
            icon={<ImageIcon className="h-4 w-4" />}
            title="Imagen"
            subtitle="PNG, JPEG o portapapeles"
            disabled={exportsDisabled}
            pending={
              isPending('image-png') || isPending('image-jpeg') || isPending('copy-image')
            }
            menu={
              <>
                <DropdownMenuLabel className="text-xs">Formato de imagen</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={exportsDisabled || Boolean(pending)}
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
                  disabled={exportsDisabled || Boolean(pending)}
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
                  disabled={exportsDisabled || Boolean(pending)}
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
            disabled={exportsDisabled}
            pending={isPending('print-estructurado') || isPending('print-snapshot')}
            menu={
              <>
                <DropdownMenuLabel className="text-xs">Modo de impresión</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={exportsDisabled || Boolean(pending)}
                  onClick={() => void run('print-snapshot', () => onPrintPdf('snapshot'))}
                  className="gap-2.5"
                >
                  <Monitor className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                  <div>
                    <p className="text-sm font-medium">Como en pantalla</p>
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      Imprime lo que ves en la web.
                    </p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={exportsDisabled || Boolean(pending)}
                  onClick={() => void run('print-estructurado', () => onPrintPdf('estructurado'))}
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
              </>
            }
            onPrimary={() => void run('print-snapshot', () => onPrintPdf('snapshot'))}
          />
        </div>
      </div>
    </section>
  );
}

function ExportTile({
  icon,
  title,
  subtitle,
  disabled,
  pending,
  menu,
  onPrimary,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
  pending?: boolean;
  menu: React.ReactNode;
  onPrimary: () => void;
}) {
  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] shadow-sm transition-colors',
        disabled && 'opacity-55'
      )}
    >
      <button
        type="button"
        onClick={onPrimary}
        disabled={disabled || pending}
        className="inline-flex min-h-14 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-muted)]/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--color-foreground)]">{title}</span>
          <span className="block text-[11px] text-[var(--color-muted-foreground)]">{subtitle}</span>
        </span>
      </button>
      <div className="w-px bg-[var(--color-border)]" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled || pending}
            className="inline-flex h-full w-10 shrink-0 items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/40 hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Más opciones de ${title}`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}