/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core';
import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<PrecacheEntry | string>;
};

// Precache de la app shell + assets con hash inyectados por vite-plugin-pwa.
// Cada build genera un manifiesto consistente: el SW solo sirve un snapshot
// coherente y `autoUpdate` lo reemplaza de forma atomica, evitando los fallos
// de "chunk dinamico no encontrado" tras un deploy.
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
      icon: '/pwa-icon-192.png',
      badge: '/pwa-icon-192.png',
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
