import { useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  Bell,
  CheckCircle2,
  Copy,
  Info,
  MapPin,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/PageHeader';
import { SurfaceCard } from '@/components/ui/surface-card';
import { useMensajeAgenciaEeuu } from '@/hooks/useMensajeAgenciaEeuu';
import { PublicContactSection } from '@/components/public/PublicContactSection';
import { parseWhatsAppPreviewToReact } from '@/pages/dashboard/parametros-sistema/whatsappFormatPreview';
import { cn } from '@/lib/utils';
import { PwaInstallGuideDialog } from '@/components/pwa/PwaInstallGuideDialog';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useActivarNotificaciones } from '@/hooks/useWebPush';
import { isMobileDevice } from '@/lib/pwa';

export function CasilleroPage() {
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
        title="Mi casillero"
        description="Dirección y horarios de tu casillero en EE. UU. para que envíes o retires tus paquetes con claridad."
        breadcrumbs={
          <span className="font-semibold uppercase tracking-[0.12em]">
            Envíos desde Estados Unidos
          </span>
        }
      />

      {isLoading ? (
        <div aria-busy="true" aria-live="polite">
          <SurfaceCardSkeleton bodyLines={6} />
          <span className="sr-only">Cargando información…</span>
        </div>
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

      <MobilePortalPanel />

      <PublicContactSection
        asCard
        title="¿Necesitas ayuda?"
        description="Contáctanos por los canales habilitados por ECUBOX."
        variant="inline"
      />
    </div>
  );
}

function MobilePortalPanel() {
  const pwa = usePwaInstall();
  const notificaciones = useActivarNotificaciones();
  const showInstallHelp = !pwa.isInstalled && isMobileDevice();

  const requestNotifications = () => {
    notificaciones.activate();
  };

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/25 px-4 py-3.5 sm:px-5">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
          <Smartphone className="h-4 w-4 text-[var(--color-primary)]" />
          Portal móvil
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Instala ECUBOX y activa avisos desde el celular.
        </p>
        {showInstallHelp && (
          <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
            Agrega ECUBOX a tu pantalla de inicio.{' '}
            <button
              type="button"
              className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline"
              onClick={pwa.openInstallGuide}
            >
              Ver pasos
            </button>
          </p>
        )}
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
        <MobilePortalAction
          icon={<Smartphone className="h-4 w-4" />}
          completed={pwa.isInstalled}
          title={pwa.isInstalled ? 'App instalada' : 'Instalar ECUBOX'}
          description={
            pwa.isInstalled
              ? 'Abre el portal desde tu pantalla de inicio.'
              : 'Acceso rápido a tracking, calculadora y casillero.'
          }
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void pwa.requestInstall()}
                disabled={pwa.isInstalled}
              >
                {pwa.isInstalled ? 'Listo' : 'Instalar'}
              </Button>
              {showInstallHelp && (
                <Button type="button" size="sm" variant="ghost" onClick={pwa.openInstallGuide}>
                  Como instalar
                </Button>
              )}
            </div>
          }
        />
        <MobilePortalAction
          icon={<Bell className="h-4 w-4" />}
          completed={notificaciones.isGranted}
          title={notificaciones.isGranted ? 'Notificaciones activas' : 'Notificaciones'}
          description={
            notificaciones.isGranted
              ? 'Listas para avisos de estado.'
              : 'Activa avisos cuando tu navegador lo permita.'
          }
          action={
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                !notificaciones.isSupported || notificaciones.isGranted || notificaciones.isPending
              }
              onClick={requestNotifications}
            >
              {notificaciones.isGranted
                ? 'Activas'
                : notificaciones.isPending
                  ? 'Activando...'
                  : 'Activar'}
            </Button>
          }
        />
      </div>
      <PwaInstallGuideDialog
        open={pwa.guideOpen}
        onOpenChange={pwa.setGuideOpen}
        platform={pwa.platform}
        inAppBrowser={pwa.isInAppBrowser}
        nativeDismissed={pwa.nativeDismissed}
      />
    </SurfaceCard>
  );
}

function MobilePortalAction({
  icon,
  title,
  description,
  action,
  completed = false,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
  /** Muestra el visto verde junto al titulo (p. ej. PWA instalada o avisos activos). */
  completed?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] p-3">
      <div className="flex items-start gap-2.5">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-foreground)]">
            {title}
            {completed ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" aria-hidden />
            ) : null}
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
            {description}
          </p>
          <div className="mt-3">{action}</div>
        </div>
      </div>
    </div>
  );
}
