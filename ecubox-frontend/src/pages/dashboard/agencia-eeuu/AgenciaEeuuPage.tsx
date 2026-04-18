import { useCallback } from 'react';
import { Copy, MapPin, Info } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { SurfaceCard } from '@/components/ui/surface-card';
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
    <div className="mx-auto max-w-3xl page-stack">
      <PageHeader
        icon={<MapPin className="h-5 w-5" />}
        title="Destino agencia USA"
        description="Dirección y horarios de nuestra agencia en EE. UU. para que envíes o retires tus paquetes con claridad."
        breadcrumbs={
          <span className="font-semibold uppercase tracking-[0.12em]">
            Envíos desde Estados Unidos
          </span>
        }
      />

      {isLoading ? (
        <LoadingState text="Cargando información…" />
      ) : error ? (
        <div role="alert" className="ui-alert ui-alert-error">
          No se pudo cargar el mensaje. Intenta de nuevo más tarde.
        </div>
      ) : (
        <SurfaceCard
          className={cn('overflow-hidden p-0 ring-1 ring-[var(--color-border)]/40')}
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
        </SurfaceCard>
      )}
    </div>
  );
}

