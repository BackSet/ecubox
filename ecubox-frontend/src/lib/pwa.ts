export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

export function registerServiceWorker() {
  if (import.meta.env.DEV) return;
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // El portal sigue siendo usable aunque el navegador rechace el SW.
    });
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

export async function notifyUser(title: string, options?: NotificationOptions): Promise<void> {
  if (!canUseNotifications() || Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        ...options,
      });
      return;
    }
  } catch (error) {
    console.warn('Service Worker notification failed, falling back', error);
  }

  try {
    const notification = new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    });

    notification.onclick = () => {
      const targetUrl = (notification as Notification & { data?: { url?: string } }).data?.url;
      if (targetUrl) {
        window.focus();
        window.location.href = targetUrl;
      }
      notification.close();
    };
  } catch (error) {
    console.error('Notification constructor failed', error);
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
