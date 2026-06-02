import { AlertTriangle, MoreVertical, PlusSquare, Share2, type LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InstallPlatform } from '@/lib/pwa';

type GuideStep = {
  icon: LucideIcon;
  title: string;
  text: string;
};

function getSteps(platform: InstallPlatform): GuideStep[] {
  if (platform === 'ios') {
    return [
      {
        icon: Share2,
        title: 'Abre el menu Compartir',
        text: 'En Safari toca el icono de compartir en la barra inferior.',
      },
      {
        icon: PlusSquare,
        title: 'Agrega a inicio',
        text: 'Selecciona "Agregar a pantalla de inicio" y confirma ECUBOX.',
      },
    ];
  }
  if (platform === 'android') {
    return [
      {
        icon: MoreVertical,
        title: 'Abre el menu del navegador',
        text: 'En Chrome toca el menu de tres puntos (esquina superior).',
      },
      {
        icon: PlusSquare,
        title: 'Instala ECUBOX',
        text: 'Elige "Instalar app" o "Agregar a pantalla de inicio".',
      },
    ];
  }
  return [
    {
      icon: MoreVertical,
      title: 'Abre el menu del navegador',
      text: 'Busca "Instalar app" o "Agregar a pantalla de inicio".',
    },
    {
      icon: PlusSquare,
      title: 'Confirma la instalacion',
      text: 'ECUBOX se abrira como una app independiente.',
    },
  ];
}

function getIntroText(
  platform: InstallPlatform,
  inAppBrowser: boolean,
  nativeDismissed: boolean
): string {
  if (inAppBrowser) {
    return 'Este navegador integrado no permite instalar apps. Abre ecubox.org en Chrome o Safari y sigue los pasos.';
  }
  if (platform === 'ios') {
    return 'En iPhone o iPad la instalacion se hace desde Safari: Compartir y luego Agregar a pantalla de inicio.';
  }
  if (platform === 'android') {
    if (nativeDismissed) {
      return 'Si cerraste el aviso de instalar del navegador, usa el menu de tres puntos de Chrome y elige Instalar app.';
    }
    return 'Agrega ECUBOX a tu pantalla de inicio desde el menu de Chrome (tres puntos).';
  }
  return 'Tu navegador no mostro el instalador automatico. Puedes agregar el portal desde el menu del navegador.';
}

export function PwaInstallGuideDialog({
  open,
  onOpenChange,
  platform,
  inAppBrowser = false,
  nativeDismissed = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: InstallPlatform;
  inAppBrowser?: boolean;
  /** Usuario rechazo o cerro el dialogo nativo de Chrome. */
  nativeDismissed?: boolean;
}) {
  const steps = getSteps(platform);
  const intro = getIntroText(platform, inAppBrowser, nativeDismissed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-5 shadow-none">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[var(--color-popover-foreground)]">
            Instalar ECUBOX
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {intro}
          </DialogDescription>
        </DialogHeader>
        {inAppBrowser && (
          <p className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-[var(--color-popover-foreground)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            Copia el enlace y abrelo en Chrome o Safari para poder instalar.
          </p>
        )}
        <div className="mt-2 grid gap-3">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.title}
                className="flex gap-3 rounded-md border border-[var(--color-border)] p-3"
              >
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
