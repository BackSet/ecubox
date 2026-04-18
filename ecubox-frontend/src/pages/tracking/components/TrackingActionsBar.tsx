import { useState } from 'react';
import {
  Check,
  ChevronDown,
  Clipboard,
  Copy,
  FileDown,
  FileImage,
  FileText,
  Image as ImageIcon,
  Loader2,
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

export interface TrackingActionsBarProps {
  onShare: () => void | Promise<void>;
  onCopyLink: () => void | Promise<void>;
  onPrintPdf: () => void | Promise<void>;
  onDownloadPdf: (mode: 'estructurado' | 'snapshot') => void | Promise<void>;
  onDownloadImage: (format: 'png' | 'jpeg') => void | Promise<void>;
  onCopyImage: () => void | Promise<void>;
}

type Pending =
  | 'share'
  | 'copy-link'
  | 'print-pdf'
  | 'download-pdf'
  | 'download-image'
  | 'copy-image'
  | null;

export function TrackingActionsBar({
  onShare,
  onCopyLink,
  onPrintPdf,
  onDownloadPdf,
  onDownloadImage,
  onCopyImage,
}: TrackingActionsBarProps) {
  const [pending, setPending] = useState<Pending>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  const run = async (id: Exclude<Pending, null>, fn: () => void | Promise<void>) => {
    if (pending) return;
    setPending(id);
    try {
      await fn();
      if (id === 'copy-link') {
        setLinkCopied(true);
        window.setTimeout(() => setLinkCopied(false), 1800);
      }
    } finally {
      setPending(null);
    }
  };

  const isBusy = pending !== null;

  return (
    <section className="surface-card space-y-4 p-5 sm:p-6">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-[var(--color-foreground)]">
          Compartir y guardar
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Comparte este seguimiento, imprímelo o descarga una copia para enviarla por
          otro canal.
        </p>
      </div>

      <Button
        type="button"
        className="h-11 w-full justify-center gap-2"
        disabled={isBusy}
        onClick={() => void run('share', onShare)}
      >
        {pending === 'share' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
        Compartir seguimiento
      </Button>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Button
          type="button"
          variant="outline"
          className="h-10 justify-start gap-2.5"
          disabled={isBusy}
          onClick={() => void run('copy-link', onCopyLink)}
        >
          {pending === 'copy-link' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : linkCopied ? (
            <Check className="h-4 w-4 text-emerald-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {linkCopied ? 'Enlace copiado' : 'Copiar enlace'}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="h-10 justify-start gap-2.5"
          disabled={isBusy}
          onClick={() => void run('print-pdf', onPrintPdf)}
        >
          {pending === 'print-pdf' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Printer className="h-4 w-4" />
          )}
          Imprimir PDF
        </Button>

        <SplitDropdownButton
          icon={
            pending === 'download-pdf' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileText className="h-4 w-4" />
            )
          }
          label="Descargar PDF"
          mainAction={() => void run('download-pdf', () => onDownloadPdf('estructurado'))}
          disabled={isBusy}
        >
          <DropdownMenuLabel className="text-xs">Formato del PDF</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void run('download-pdf', () => onDownloadPdf('estructurado'))}
            className="gap-2"
          >
            <FileText className="h-4 w-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">Estructurado</p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                Texto seleccionable, ideal para imprimir.
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void run('download-pdf', () => onDownloadPdf('snapshot'))}
            className="gap-2"
          >
            <FileImage className="h-4 w-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">Captura visual</p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                Replica exactamente lo que ves en pantalla.
              </p>
            </div>
          </DropdownMenuItem>
        </SplitDropdownButton>

        <SplitDropdownButton
          icon={
            pending === 'download-image' || pending === 'copy-image' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )
          }
          label="Descargar imagen"
          mainAction={() => void run('download-image', () => onDownloadImage('png'))}
          disabled={isBusy}
        >
          <DropdownMenuLabel className="text-xs">Formato</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void run('download-image', () => onDownloadImage('png'))}
            className="gap-2"
          >
            <FileImage className="h-4 w-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">PNG (alta calidad)</p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                Sin pérdida, ideal para web o impresión.
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => void run('download-image', () => onDownloadImage('jpeg'))}
            className="gap-2"
          >
            <FileDown className="h-4 w-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">JPEG (más liviano)</p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                Tamaño reducido para enviar por mensajería.
              </p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void run('copy-image', onCopyImage)}
            className="gap-2"
          >
            <Clipboard className="h-4 w-4" />
            <div className="flex-1">
              <p className="text-sm font-medium">Copiar al portapapeles</p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">
                Pega la imagen donde necesites.
              </p>
            </div>
          </DropdownMenuItem>
        </SplitDropdownButton>
      </div>
    </section>
  );
}

interface SplitDropdownButtonProps {
  icon: React.ReactNode;
  label: string;
  mainAction: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

function SplitDropdownButton({
  icon,
  label,
  mainAction,
  disabled,
  children,
}: SplitDropdownButtonProps) {
  return (
    <div className="flex w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-background)] shadow-sm transition-colors focus-within:border-[var(--color-primary)]/40">
      <button
        type="button"
        onClick={mainAction}
        disabled={disabled}
        className="inline-flex h-10 flex-1 items-center justify-start gap-2.5 px-3 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]/60 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {icon}
        <span className="truncate">{label}</span>
      </button>
      <div className="w-px bg-[var(--color-border)]" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="inline-flex h-10 w-9 items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/60 hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Más opciones de ${label}`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
