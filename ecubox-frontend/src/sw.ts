/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { ExpirationPlugin } from 'workbox-expiration';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

// Precache de la app shell + assets con hash inyectados por vite-plugin-pwa.
// Cada build genera un manifiesto consistente: el SW solo sirve un snapshot
// coherente y el flujo `prompt` lo reemplaza de forma atomica al confirmar la
// actualizacion, evitando los fallos de "chunk dinamico no encontrado" tras un
// deploy.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Navegaciones SPA: devolver el index.html precacheado (revisionado), salvo
// para rutas de API o recursos con extension. Asi el HTML siempre coincide con
// los chunks precacheados de esta version del SW.
const navigationHandler = createHandlerBoundToURL('index.html');
registerRoute(
  new NavigationRoute(navigationHandler, {
    denylist: [/^\/api\//, /\/[^/?]+\.[^/]+$/],
  })
);

// Las peticiones a la API nunca deben pasar por la cache del SW.
registerRoute(({ url }) => url.pathname.startsWith('/api/'), new NetworkOnly());

// Los modulos pesados excluidos del precache y los recursos estaticos se
// conservan despues del primer uso. Los nombres con hash hacen CacheFirst
// seguro, y los limites evitan que la PWA crezca sin control.
registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ['script', 'style', 'worker'].includes(request.destination),
  new CacheFirst({
    cacheName: 'ecubox-static-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 30 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ['image', 'font'].includes(request.destination),
  new CacheFirst({
    cacheName: 'ecubox-media-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 60 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new StaleWhileRevalidate({
    cacheName: 'ecubox-google-fonts-css-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 }),
    ],
  })
);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.gstatic.com',
  new CacheFirst({
    cacheName: 'ecubox-google-fonts-v1',
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxEntries: 12,
        maxAgeSeconds: 365 * 24 * 60 * 60,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// Flujo "prompt": el SW nuevo espera hasta que el cliente confirme la
// actualizacion (boton "Actualizar"), momento en que virtual:pwa-register envia
// SKIP_WAITING. Asi el usuario sigue en una version consistente hasta recargar.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

// En la primera instalacion no hay SW previo, asi que tomar el control de las
// pestañas abiertas es seguro y habilita push sin requerir recarga.
clientsClaim();

interface PushPayload {
  title?: string;
  body?: string;
  tag?: string;
  url?: string;
}

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: PushPayload;
  try {
    payload = event.data.json() as PushPayload;
  } catch {
    payload = {
      title: 'ECUBOX',
      body: event.data.text() || 'Tienes una actualizacion pendiente.',
    };
  }

  const title = payload.title || 'ECUBOX';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || 'Tienes una actualizacion pendiente.',
      icon: '/icons/ecubox-monogram-192.png',
      badge: '/icons/ecubox-monogram-192.png',
      tag: payload.tag,
      data: { url: payload.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const rawUrl = (event.notification.data as { url?: string } | undefined)?.url || '/';
  // Solo permitimos navegacion interna (mismo origen) para evitar redirecciones
  // a destinos arbitrarios incrustados en el payload.
  let targetUrl: string;
  try {
    const resolved = new URL(rawUrl, self.location.origin);
    targetUrl = resolved.origin === self.location.origin ? resolved.href : self.location.origin;
  } catch {
    targetUrl = self.location.origin;
  }

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (clientsList) => {
        for (const client of clientsList) {
          if ('focus' in client) {
            if ('navigate' in client) {
              await client.navigate(targetUrl);
            }
            return client.focus();
          }
        }
        return self.clients.openWindow(targetUrl);
      })
  );
});
