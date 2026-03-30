import { useCallback } from 'react';
import { Copy, MapPin, Info } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { useMensajeAgenciaEeuu } from '@/hooks/useMensajeAgenciaEeuu';
import { parseWhatsAppPreviewToReact } from '@/pages/dashboard/parametros-sistema/whatsappFormatPreview';
import { cn } from '@/lib/utils';

export function AgenciaEeuuPage() {
  const { data, isLoading, error } = useMensajeAgenciaEeuu();
  const mensajePlano = data?.mensaje?.trim() ?? '';
  const hayMensaje = Boolean(mensajePlano);

  const copiarMensaje = useCallback(async () => {
    if (!hayMensaje) return;
    try {
      await navigator.clipboard.writeText(mensajePlano);
      toast.success('Texto copiado al portapapeles');
    } catch {
      toast.error('No se pudo copiar. Intenta seleccionar el texto manualmente.');
    }
  }, [hayMensaje, mensajePlano]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header
        className={cn(
          'relative overflow-hidden rounded-2xl border border-[var(--color-border)]',
          'bg-gradient-to-br from-[var(--color-card)] via-[var(--color-card)] to-[var(--color-primary)]/[0.06]',
          'px-6 py-8 sm:px-8 sm:py-10'
        )}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[var(--color-primary)]/[0.08] blur-2xl"
          aria-hidden
        />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
          <div
            className={cn(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
              'border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/10',
              'text-[var(--color-primary)]'
            )}
            aria-hidden
          >
            <MapPin className="h-7 w-7" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
              Envíos desde Estados Unidos
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
              Destino agencia USA
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:text-[15px]">
              Dirección y horarios de nuestra agencia en EE. UU. para que envíes o retires tus paquetes con
              claridad.
            </p>
          </div>
        </div>
      </header>

      {isLoading ? (
        <LoadingState text="Cargando información…" />
      ) : error ? (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 p-5 text-sm text-[var(--color-destructive)]"
        >
          No se pudo cargar el mensaje. Intenta de nuevo más tarde.
        </div>
      ) : (
        <section
          className={cn(
            'overflow-hidden rounded-2xl border border-[var(--color-border)]',
            'bg-[var(--color-card)] shadow-sm',
            'ring-1 ring-[var(--color-border)]/40'
          )}
        >
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/25 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Información para tu envío</h2>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Copia el texto para pegarlo en notas, correo o mensajes.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="shrink-0 gap-2 sm:self-center"
              disabled={!hayMensaje}
              onClick={() => void copiarMensaje()}
            >
              <Copy className="h-4 w-4" />
              Copiar texto
            </Button>
          </div>
          <div className="px-4 py-6 sm:px-6 sm:py-8">
            {hayMensaje ? (
              <div className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-[var(--color-foreground)] sm:text-base">
                {parseWhatsAppPreviewToReact(mensajePlano)}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-muted)]/40">
                  <Info className="h-4 w-4 opacity-60" aria-hidden />
                </span>
                No hay información configurada. Un administrador puede definirla en Parámetros del sistema.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

