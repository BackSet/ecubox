import {
  AlertTriangle,
  Bell,
  Compass,
  Globe,
  MonitorDown,
  MoreVertical,
  PlusSquare,
  Share2,
  type LucideIcon,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { InstallBrowser, InstallPlatform } from '@/lib/pwa';

type GuideStep = {
  icon: LucideIcon;
  title: string;
  text: string;
};

type NotificationAvailability =
  | NotificationPermission
  | 'requires-install'
  | 'unsupported';

function getSteps(
  platform: InstallPlatform,
  browser: InstallBrowser,
  notificationPermission: NotificationAvailability
): GuideStep[] {
  if (platform === 'ios') {
    if (browser !== 'safari') {
      return [
        {
          icon: Share2,
          title: `Abre Compartir en ${getBrowserName(browser)}`,
          text: 'Toca el icono Compartir junto a la barra de direcciones y elige "Agregar a pantalla de inicio".',
        },
        {
          icon: PlusSquare,
          title: 'Confirma la app web',
          text: 'Activa "Abrir como app web" si aparece y toca Agregar. Si no ves la opcion, abre ecubox.org en Safari.',
        },
      ];
    }
    return [
      {
        icon: Share2,
        title: 'Abre Compartir en Safari',
        text: 'Toca Mas y luego Compartir. Según el diseño de pestañas, el icono Compartir puede aparecer directamente en la barra.',
      },
      {
        icon: PlusSquare,
        title: 'Crea la app web',
        text: 'Elige "Agregar a pantalla de inicio", activa "Abrir como app web" y toca Agregar.',
      },
      {
        icon: Bell,
        title: 'Activa los avisos desde la app',
        text: 'Abre ECUBOX desde el icono de Inicio y pulsa "Activar avisos". iOS no habilita Web Push desde una pestaña normal.',
      },
    ];
  }
  if (platform === 'android') {
    if (browser === 'firefox') {
      return [
        {
          icon: MoreVertical,
          title: 'Abre el menu de Firefox',
          text: 'Toca los tres puntos y selecciona "Instalar".',
        },
        {
          icon: PlusSquare,
          title: 'Agrega ECUBOX',
          text: 'En el panel "Agregar a pantalla de inicio", toca "Agregar automaticamente".',
        },
      ];
    }
    if (browser === 'samsung') {
      return [
        {
          icon: PlusSquare,
          title: 'Toca el icono Instalar',
          text: 'Samsung Internet muestra un icono de instalacion en la barra superior cuando la PWA esta disponible.',
        },
        {
          icon: MonitorDown,
          title: 'Confirma la instalacion',
          text: 'Selecciona "Instalar en la pantalla Aplicaciones" para agregar ECUBOX.',
        },
      ];
    }
    if (browser === 'edge') {
      return [
        {
          icon: MoreVertical,
          title: 'Abre el menu de Edge',
          text: 'Toca los tres puntos y busca "Agregar al telefono" o "Instalar esta aplicacion".',
        },
        {
          icon: PlusSquare,
          title: 'Confirma ECUBOX',
          text: 'Toca Instalar y sigue la confirmacion de Android.',
        },
      ];
    }
    return [
      {
        icon: MoreVertical,
        title: `Abre el menu de ${getBrowserName(browser)}`,
        text:
          browser === 'chrome'
            ? 'Toca los tres puntos a la derecha de la barra de direcciones.'
            : 'Abre el menu principal del navegador.',
      },
      {
        icon: PlusSquare,
        title: 'Instala ECUBOX',
        text:
          browser === 'chrome'
            ? 'Selecciona "Agregar a pantalla principal" y después "Instalar".'
            : 'Selecciona "Agregar a pantalla de inicio" o "Instalar aplicacion".',
      },
    ];
  }
  if (platform === 'windows') {
    if (browser === 'firefox') {
      return [
        {
          icon: AlertTriangle,
          title: 'Firefox no instala PWA en Windows',
          text: 'Abre ecubox.org en Microsoft Edge o Google Chrome para instalarla como aplicacion.',
        },
        {
          icon: MonitorDown,
          title: 'Instala desde un navegador compatible',
          text: 'En Edge usa Mas herramientas, Aplicaciones e Instalar este sitio como una aplicacion. En Chrome usa Enviar, guardar y compartir e Instalar pagina como aplicacion.',
        },
      ];
    }
    const installStep =
      browser === 'edge'
        ? 'Abre Configuracion y mas (tres puntos), Mas herramientas, Aplicaciones e "Instalar este sitio como una aplicacion".'
        : browser === 'chrome'
          ? 'Abre los tres puntos, "Enviar, guardar y compartir" e "Instalar pagina como aplicacion". Tambien puedes usar el icono Instalar de la barra de direcciones.'
          : 'Usa el icono Instalar de la barra de direcciones o abre el menu del navegador y busca Instalar aplicacion.';
    return [
      {
        icon: MonitorDown,
        title: `Instala desde ${getBrowserName(browser)}`,
        text: installStep,
      },
      {
        icon: PlusSquare,
        title: 'Integra ECUBOX con Windows',
        text: 'Confirma la instalacion y elige si deseas anclar ECUBOX al menu Inicio o a la barra de tareas.',
      },
      {
        icon: Bell,
        title:
          notificationPermission === 'granted'
            ? 'Avisos de Windows activos'
            : notificationPermission === 'denied'
              ? 'Habilita el permiso bloqueado'
              : 'Activa los avisos',
        text:
          notificationPermission === 'granted'
            ? 'ECUBOX ya puede mostrar avisos en el centro de notificaciones de Windows.'
            : notificationPermission === 'denied'
              ? 'En el candado de la barra de direcciones permite Notificaciones. Revisa tambien Configuracion de Windows, Sistema y Notificaciones.'
              : 'Regresa a ECUBOX, pulsa Activar avisos y permite las notificaciones del navegador.',
      },
    ];
  }
  if (browser === 'safari') {
    return [
      {
        icon: Share2,
        title: 'Agrega ECUBOX al Dock',
        text: 'En macOS Sonoma 14 o posterior abre Archivo y selecciona "Agregar al Dock". Tambien puedes usar Compartir y "Agregar al Dock".',
      },
      {
        icon: Bell,
        title: 'Activa avisos dentro de la app',
        text: 'Abre ECUBOX desde el Dock y acepta las notificaciones desde esa ventana, no desde la pestaña de Safari.',
      },
    ];
  }
  if (browser === 'firefox') {
    return [
      {
        icon: AlertTriangle,
        title: 'Firefox no ofrece instalacion de escritorio',
        text: 'Para instalar ECUBOX como app, abre el sitio en Chrome o Edge. En macOS tambien puedes usar Safari y "Agregar al Dock".',
      },
    ];
  }
  return [
    {
      icon: MoreVertical,
      title: `Abre el menu de ${getBrowserName(browser)}`,
      text:
        browser === 'chrome'
          ? 'Selecciona "Enviar, guardar y compartir" y luego "Instalar pagina como aplicacion".'
          : browser === 'edge'
            ? 'Selecciona Mas herramientas, Aplicaciones e "Instalar este sitio como una aplicacion".'
            : 'Busca "Instalar aplicacion" o usa el icono Instalar de la barra de direcciones.',
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
  browser: InstallBrowser,
  inAppBrowser: boolean,
  nativeDismissed: boolean
): string {
  if (inAppBrowser) {
    return 'Este navegador integrado no permite instalar apps. Abre ecubox.org en Chrome, Edge o Safari y sigue los pasos.';
  }
  if (platform === 'ios') {
    return `Estas usando ${getBrowserName(browser)} en iPhone o iPad. La instalacion se realiza desde Compartir y "Agregar a pantalla de inicio".`;
  }
  if (platform === 'android') {
    if (nativeDismissed) {
      return `Si cerraste el aviso de instalacion, abre el menu de ${getBrowserName(browser)} y busca Instalar o Agregar a pantalla de inicio.`;
    }
    return `Estas usando ${getBrowserName(browser)} en Android. Sigue la ruta indicada para agregar ECUBOX como aplicacion.`;
  }
  if (platform === 'windows') {
    return `Estas usando ${getBrowserName(browser)} en Windows. Instala ECUBOX como aplicacion y activa los avisos del sistema.`;
  }
  return `Estas usando ${getBrowserName(browser)}. Sigue estos pasos para instalar ECUBOX en tu computadora.`;
}

const BROWSER_NAMES: Record<InstallBrowser, string> = {
  chrome: 'Google Chrome',
  edge: 'Microsoft Edge',
  firefox: 'Firefox',
  opera: 'Opera',
  safari: 'Safari',
  samsung: 'Samsung Internet',
  other: 'tu navegador',
};

function getBrowserName(browser: InstallBrowser): string {
  return BROWSER_NAMES[browser];
}

export function PwaInstallGuideDialog({
  open,
  onOpenChange,
  browser,
  platform,
  inAppBrowser = false,
  nativeDismissed = false,
  notificationPermission = 'default',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  browser: InstallBrowser;
  platform: InstallPlatform;
  inAppBrowser?: boolean;
  /** Usuario rechazo o cerro el dialogo nativo de Chrome. */
  nativeDismissed?: boolean;
  notificationPermission?: NotificationAvailability;
}) {
  const steps = getSteps(platform, browser, notificationPermission);
  const intro = getIntroText(platform, browser, inAppBrowser, nativeDismissed);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-5 shadow-none">
        <DialogHeader>
          <div className="mb-1 inline-flex w-fit items-center gap-1.5 rounded-md bg-[var(--color-muted)] px-2 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)]">
            {browser === 'safari' ? (
              <Compass className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Globe className="h-3.5 w-3.5" aria-hidden />
            )}
            {getBrowserName(browser)}
          </div>
          <DialogTitle className="text-lg font-semibold text-[var(--color-popover-foreground)]">
            Instalar ECUBOX
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {intro}
          </DialogDescription>
        </DialogHeader>
        {inAppBrowser && (
          <p className="flex items-start gap-2 rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-popover-foreground)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden />
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
