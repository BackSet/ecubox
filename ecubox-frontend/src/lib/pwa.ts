import { toast } from 'sonner';

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export type InstallPlatform = 'ios' | 'android' | 'desktop';

function resolveUserAgent(userAgent?: string): string {
  if (userAgent !== undefined) return userAgent;
  return typeof navigator !== 'undefined' ? navigator.userAgent : '';
}

export function detectInstallPlatform(userAgent?: string): InstallPlatform {
  const ua = resolveUserAgent(userAgent).toLowerCase();
  const isIOS =
    /iphone|ipad|ipod/.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1);
  if (isIOS) return 'ios';
  if (/android/.test(ua)) return 'android';
  return 'desktop';
}

export function isMobileDevice(userAgent?: string): boolean {
  const platform = detectInstallPlatform(userAgent);
  return platform === 'ios' || platform === 'android';
}

/** Navegadores embebidos (Instagram, Facebook, etc.) no permiten instalar PWA. */
export function isInAppBrowser(userAgent?: string): boolean {
  const ua = resolveUserAgent(userAgent).toLowerCase();
  return /instagram|fbav|fban|fb_iab|line\/|twitter|tiktok|snapchat|linkedinapp/.test(ua);
}

export function requiresManualInstallGuide(
  platform: InstallPlatform,
  hasDeferredPrompt: boolean
): boolean {
  if (platform === 'ios') return true;
  return !hasDeferredPrompt;
}

function promptForUpdate(reload: () => void) {
  toast('Hay una nueva version disponible', {
    description: 'Recarga para actualizar ECUBOX.',
    duration: Infinity,
    action: {
      label: 'Actualizar',
      onClick: reload,
    },
  });
}

export function registerServiceWorker() {
  if (import.meta.env.DEV) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // Carga diferida del modulo virtual del plugin para no acoplarlo al grafo de
  // tests (vitest no tiene el plugin de Vite activo).
  void import('virtual:pwa-register')
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          promptForUpdate(() => {
            void updateSW(true);
          });
        },
      });
    })
    .catch(() => {
      // El portal sigue siendo usable aunque el navegador rechace el SW.
    });
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function canUseNotifications(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!canUseNotifications()) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/**
 * Muestra una notificacion del sistema usando exclusivamente
 * `ServiceWorkerRegistration.showNotification`. Se evita a proposito el
 * constructor `new Notification(...)`, que los navegadores prohiben (Illegal
 * constructor) en paginas controladas por un Service Worker, como ocurre en la
 * PWA instalada.
 */
export async function notifyUser(title: string, options?: NotificationOptions): Promise<void> {
  if (!canUseNotifications() || Notification.permission !== 'granted') return;
  // Si la pestaña esta visible, el usuario ya ve la campana de notificaciones;
  // evitamos duplicar el aviso como notificacion del sistema operativo.
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') return;
  if (!('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      icon: '/icons/ecubox-monogram-192.png',
      badge: '/icons/ecubox-monogram-192.png',
      ...options,
    });
  } catch (error) {
    console.warn('No se pudo mostrar la notificacion del sistema', error);
  }
}

/**
 * Indica si el navegador ya tiene una suscripcion Web Push activa. Cuando la
 * hay, el servidor entrega las notificaciones (incluso con la app cerrada), por
 * lo que el cliente no debe duplicarlas con avisos locales durante el polling.
 */
export async function hasActivePushSubscription(): Promise<boolean> {
  if (
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    typeof window === 'undefined' ||
    !('PushManager' in window)
  ) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return subscription !== null;
  } catch {
    return false;
  }
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }
  return output;
}

export async function subscribeToWebPush(publicKey: string): Promise<PushSubscription | null> {
  if (
    typeof window === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window)
  ) {
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (existing) {
    return existing;
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

export function serializePushSubscription(
  subscription: PushSubscription
): { endpoint: string; keys: { p256dh: string; auth: string } } {
  const json = subscription.toJSON();
  const p256dh = json.keys?.p256dh;
  const auth = json.keys?.auth;
  if (!json.endpoint || !p256dh || !auth) {
    throw new Error('Suscripcion push incompleta');
  }
  return {
    endpoint: json.endpoint,
    keys: { p256dh, auth },
  };
}

export function normalizeWhatsAppUrl(raw?: string | null, text?: string): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    const url = new URL(value);
    if (text && !url.searchParams.has('text')) url.searchParams.set('text', text);
    return url.toString();
  }
  const digits = value.replace(/\D+/g, '');
  if (!digits) return null;
  const url = new URL(`https://wa.me/${digits}`);
  if (text) url.searchParams.set('text', text);
  return url.toString();
}
