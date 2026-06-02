import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bell,
  CheckCircle2,
  Copy,
  FileUp,
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
import { isStandalonePwa, type InstallPromptEvent } from '@/lib/pwa';

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
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(isStandalonePwa);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification === 'undefined' ? 'default' : Notification.permission
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const canAskNotifications = typeof Notification !== 'undefined';
  const totalFilesSize = useMemo(
    () => selectedFiles.reduce((sum, file) => sum + file.size, 0),
    [selectedFiles]
  );

  const installApp = async () => {
    if (!installPrompt) {
      toast.info('Usa la opción "Agregar a pantalla de inicio" de tu navegador.');
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      toast.success('ECUBOX agregado a tu dispositivo');
    }
    setInstallPrompt(null);
  };

  const requestNotifications = async () => {
    if (!canAskNotifications) {
      toast.info('Este navegador no permite notificaciones web.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      toast.success('Notificaciones activadas');
    } else {
      toast.info('Puedes activar notificaciones desde la configuración del navegador.');
    }
  };

  return (
    <SurfaceCard className="overflow-hidden p-0">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-muted)]/25 px-4 py-3.5 sm:px-5">
        <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
          <Smartphone className="h-4 w-4 text-[var(--color-primary)]" />
          Portal móvil
        </h2>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Instala ECUBOX, consulta tu casillero y prepara comprobantes desde el celular.
        </p>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
        <MobilePortalAction
          icon={<Smartphone className="h-4 w-4" />}
          title={isInstalled ? 'App instalada' : 'Instalar ECUBOX'}
          description={
            isInstalled
              ? 'Abre el portal desde tu pantalla de inicio.'
              : 'Acceso rápido a tracking, calculadora y casillero.'
          }
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => void installApp()}>
              {isInstalled ? 'Listo' : 'Instalar'}
            </Button>
          }
        />
        <MobilePortalAction
          icon={<Bell className="h-4 w-4" />}
          title="Notificaciones"
          description={
            notificationPermission === 'granted'
              ? 'Listas para avisos de estado.'
              : 'Activa avisos cuando tu navegador lo permita.'
          }
          action={
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={notificationPermission === 'granted'}
              onClick={() => void requestNotifications()}
            >
              {notificationPermission === 'granted' ? 'Activas' : 'Activar'}
            </Button>
          }
        />
        <MobilePortalAction
          icon={<FileUp className="h-4 w-4" />}
          title="Facturas"
          description={
            selectedFiles.length > 0
              ? `${selectedFiles.length} archivo(s), ${formatBytes(totalFilesSize)}`
              : 'Selecciona comprobantes para tenerlos listos.'
          }
          action={
            <label className="inline-flex">
              <input
                type="file"
                className="sr-only"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,image/*,application/pdf"
                onChange={(event) => setSelectedFiles(Array.from(event.target.files ?? []))}
              />
              <span className="inline-flex h-8 cursor-pointer items-center justify-center rounded-md border border-[var(--color-border)] px-3 text-xs font-medium hover:bg-[var(--color-muted)]">
                Adjuntar
              </span>
            </label>
          }
        />
      </div>
    </SurfaceCard>
  );
}

function MobilePortalAction({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action: ReactNode;
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
            {title.includes('instalada') || title.includes('Activas') ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-success)]" />
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

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
