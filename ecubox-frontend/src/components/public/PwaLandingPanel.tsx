import { useEffect, useState } from 'react';
import { Bell, Download, MoreVertical, PackageSearch, PlusSquare, ReceiptText, Share2, Smartphone } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { isStandalonePwa, requestNotificationPermission, type InstallPromptEvent } from '@/lib/pwa';
import { useAuthStore } from '@/stores/authStore';
import { useActivarWebPush } from '@/hooks/useWebPush';

type InstallPlatform = 'ios' | 'android' | 'desktop';

function detectInstallPlatform(): InstallPlatform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export function PwaLandingPanel() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const [installPlatform, setInstallPlatform] = useState<InstallPlatform>('desktop');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const token = useAuthStore((state) => state.token);
  const enableWebPush = useActivarWebPush();

  useEffect(() => {
    setInstalled(isStandalonePwa());
    setInstallPlatform(detectInstallPlatform());
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installPrompt) {
      setInstallGuideOpen(true);
      return;
    }
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    if (result.outcome === 'accepted') {
      setInstalled(true);
      setInstallPrompt(null);
    }
  }

  async function handleNotifications() {
    if (token) {
      enableWebPush.mutate();
      return;
    }
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission);
  }

  return (
    <section className="content-container-wide mobile-safe-inline py-6 sm:py-8" aria-labelledby="pwa-heading">
      <div className="grid gap-5 rounded-[8px] border border-[var(--color-landing-border)] bg-[var(--color-landing-card)] p-4 sm:p-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.65fr)] lg:items-center">
        <div className="min-w-0">
          <div className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1.5 text-xs font-semibold landing-text">
            <Smartphone className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden />
            Portal movil PWA
          </div>
          <h2 id="pwa-heading" className="text-2xl font-bold landing-text sm:text-3xl">
            Instala ECUBOX y sigue tus paquetes desde el celular.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed landing-text-muted sm:text-base">
            El portal movil permite consultar tracking, revisar tu casillero, recibir avisos de estado y cargar comprobantes sin pasar por una app nativa.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="h-11 gap-2"
              onClick={handleInstall}
              disabled={installed}
            >
              <Download className="h-4 w-4" aria-hidden />
              {installed ? 'Instalada' : 'Instalar portal'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 gap-2 landing-text"
              onClick={handleNotifications}
              disabled={notificationPermission === 'granted'}
            >
              <Bell className="h-4 w-4" aria-hidden />
              {notificationPermission === 'granted' ? 'Avisos activos' : 'Activar avisos'}
            </Button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <Link to="/tracking" className="landing-card-interactive flex items-center gap-3 p-3">
            <PackageSearch className="h-5 w-5 shrink-0 text-[var(--color-primary)]" aria-hidden />
            <span>
              <span className="block text-sm font-semibold landing-text">Tracking claro</span>
              <span className="block text-xs landing-text-muted">Estado, significado y siguiente accion.</span>
            </span>
          </Link>
          <Link to="/login" className="landing-card-interactive flex items-center gap-3 p-3">
            <ReceiptText className="h-5 w-5 shrink-0 text-[var(--color-ecubox-acento-claro)]" aria-hidden />
            <span>
              <span className="block text-sm font-semibold landing-text">Casillero y comprobantes</span>
              <span className="block text-xs landing-text-muted">Gestiona tus envios desde el portal.</span>
            </span>
          </Link>
        </div>
      </div>
      <InstallGuideDialog
        open={installGuideOpen}
        onOpenChange={setInstallGuideOpen}
        platform={installPlatform}
      />
    </section>
  );
}

function InstallGuideDialog({
  open,
  onOpenChange,
  platform,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: InstallPlatform;
}) {
  const steps =
    platform === 'ios'
      ? [
          { icon: Share2, title: 'Abre el menu Compartir', text: 'En Safari toca el icono de compartir en la barra inferior.' },
          { icon: PlusSquare, title: 'Agrega a inicio', text: 'Selecciona Agregar a pantalla de inicio y confirma ECUBOX.' },
        ]
      : platform === 'android'
        ? [
            { icon: MoreVertical, title: 'Abre el menu del navegador', text: 'En Chrome toca el menu de tres puntos.' },
            { icon: PlusSquare, title: 'Instala ECUBOX', text: 'Elige Instalar app o Agregar a pantalla de inicio.' },
          ]
        : [
            { icon: MoreVertical, title: 'Abre el menu del navegador', text: 'Busca Instalar app o Agregar a pantalla de inicio.' },
            { icon: PlusSquare, title: 'Confirma la instalacion', text: 'ECUBOX se abrira como una app independiente.' },
          ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-5 shadow-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--color-popover-foreground)]">
            Instalar ECUBOX
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            Tu navegador no mostro el instalador automatico. Puedes agregar el portal desde el menu del navegador.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2 grid gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="flex gap-3 rounded-md border border-[var(--color-border)] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[var(--color-popover-foreground)]">
                    {step.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                    {step.text}
                  </span>
                </span>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
