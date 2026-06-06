import { AppWindow, Bell, Download, WifiOff, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PwaInstallGuideDialog } from '@/components/pwa/PwaInstallGuideDialog';
import { usePwaInstall } from '@/hooks/usePwaInstall';
import { useActivarNotificaciones } from '@/hooks/useWebPush';

export function PwaLandingPanel() {
  const pwa = usePwaInstall();
  const notificaciones = useActivarNotificaciones();
  const showInstallHelp = !pwa.isInstalled;
  const isWindows = pwa.platform === 'windows';

  function handleNotifications() {
    if (
      notificaciones.permission === 'denied' ||
      notificaciones.requiresInstall
    ) {
      pwa.openInstallGuide();
      return;
    }
    notificaciones.activate();
  }

  return (
    <section className="content-container-wide mobile-safe-inline py-6 sm:py-8" aria-labelledby="pwa-heading">
      <div className="grid gap-6 rounded-[8px] border border-[var(--color-landing-border)] bg-[var(--color-landing-card)] p-4 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.65fr)] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1.5 text-xs font-semibold landing-text">
            <AppWindow className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden />
            Aplicacion PWA
          </div>
          <h2 id="pwa-heading" className="text-2xl font-bold landing-text sm:text-3xl">
            Instala ECUBOX en tu celular o computadora.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed landing-text-muted sm:text-base">
            En Windows funciona como una aplicacion independiente, aparece en Inicio y la barra de
            tareas, y puede mostrar avisos de tus paquetes.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              type="button"
              className="h-11 gap-2"
              onClick={() => void pwa.requestInstall()}
              disabled={pwa.isInstalled}
            >
              <Download className="h-4 w-4" aria-hidden />
              {pwa.isInstalled
                ? 'Instalada'
                : isWindows
                  ? 'Instalar en Windows'
                  : 'Instalar ECUBOX'}
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
                notificaciones.permission === 'unsupported' ||
                notificaciones.isGranted ||
                notificaciones.isPending
              }
            >
              <Bell className="h-4 w-4" aria-hidden />
              {notificaciones.isGranted
                ? 'Avisos activos'
                : notificaciones.isPending
                  ? 'Activando...'
                  : notificaciones.permission === 'denied'
                    ? 'Habilitar avisos'
                    : notificaciones.requiresInstall
                      ? 'Instalar para avisos'
                    : 'Activar avisos'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 border-t border-[var(--color-landing-border)] pt-4 sm:grid-cols-3 lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <PwaBenefit
            icon={Download}
            title="Instalacion directa"
            text="Edge y Chrome pueden agregar ECUBOX a Windows, Android y otros sistemas compatibles."
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
        browser={pwa.browser}
        platform={pwa.platform}
        inAppBrowser={pwa.isInAppBrowser}
        nativeDismissed={pwa.nativeDismissed}
        notificationPermission={notificaciones.permission}
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
