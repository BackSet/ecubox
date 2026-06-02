import { Bell, Download, Smartphone, WifiOff, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PwaInstallGuideDialog } from '@/components/pwa/PwaInstallGuideDialog';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useActivarNotificaciones } from '@/hooks/useWebPush';
import { isMobileDevice } from '@/lib/pwa';

export function PwaLandingPanel() {
  const pwa = usePwaInstall();
  const notificaciones = useActivarNotificaciones();
  const showInstallHelp = !pwa.isInstalled && isMobileDevice();

  function handleNotifications() {
    notificaciones.activate();
  }

  return (
    <section className="content-container-wide mobile-safe-inline py-6 sm:py-8" aria-labelledby="pwa-heading">
      <div className="grid gap-6 rounded-[8px] border border-[var(--color-landing-border)] bg-[var(--color-landing-card)] p-4 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.65fr)] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1.5 text-xs font-semibold landing-text">
            <Smartphone className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden />
            Portal movil PWA
          </div>
          <h2 id="pwa-heading" className="text-2xl font-bold landing-text sm:text-3xl">
            Lleva ECUBOX como acceso directo en tu celular.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed landing-text-muted sm:text-base">
            Sin tienda de apps ni descarga pesada: abre el portal desde la pantalla de inicio,
            mantiene tus accesos a mano y activa avisos cuando tu cuenta este lista.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="h-11 gap-2"
              onClick={() => void pwa.requestInstall()}
              disabled={pwa.isInstalled}
            >
              <Download className="h-4 w-4" aria-hidden />
              {pwa.isInstalled ? 'Instalada' : 'Instalar portal'}
            </Button>
            {showInstallHelp && (
              <Button
                type="button"
                variant="outline"
                className="h-11 gap-2 landing-text"
                onClick={pwa.openInstallGuide}
              >
                Como instalar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 landing-text"
              onClick={handleNotifications}
              disabled={
                !notificaciones.isSupported || notificaciones.isGranted || notificaciones.isPending
              }
            >
              <Bell className="h-4 w-4" aria-hidden />
              {notificaciones.isGranted
                ? 'Avisos activos'
                : notificaciones.isPending
                  ? 'Activando...'
                  : 'Activar avisos'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[var(--color-landing-border)] pt-4 sm:grid-cols-3 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <PwaBenefit
            icon={Download}
            title="Instalacion directa"
            text="El navegador agrega ECUBOX a inicio cuando el dispositivo cumple los requisitos PWA."
          />
          <PwaBenefit
            icon={Bell}
            title="Avisos de estado"
            text="Los clientes autenticados pueden activar notificaciones para cambios del paquete."
          />
          <PwaBenefit
            icon={WifiOff}
            title="Acceso resiliente"
            text="El service worker conserva recursos clave para que el portal abra con mayor estabilidad."
          />
        </div>
      </div>
      <PwaInstallGuideDialog
        open={pwa.guideOpen}
        onOpenChange={pwa.setGuideOpen}
        platform={pwa.platform}
        inAppBrowser={pwa.isInAppBrowser}
        nativeDismissed={pwa.nativeDismissed}
      />
    </section>
  );
}

function PwaBenefit({
  icon: Icon,
  title,
  text,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-w-0 gap-3">
      <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold landing-text">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed landing-text-muted">{text}</span>
      </span>
    </div>
  );
}
