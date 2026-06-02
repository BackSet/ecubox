# ECUBOX Frontend

SPA construida con React 19, Vite 8 y TypeScript 6. Incluye páginas públicas (landing, tracking, calculadora, login, registro) y un dashboard interno con gestión completa del sistema logístico.

## Configuración local

1. Copiar y editar las variables de entorno:

```bash
cp .env.example .env
```

2. Instalar dependencias y arrancar:

```bash
npm install
npm run dev
```

El servidor de desarrollo arranca en `http://localhost:5173`.

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Compilar TypeScript + build de producción |
| `npm run preview` | Previsualizar el build de producción |
| `npm audit` | Auditar vulnerabilidades |

## Estructura de directorios

```
src/
├── main.tsx              # Entrada de la aplicación
├── index.css             # Estilos globales y tokens de tema
├── routes/router.tsx     # TanStack Router (rutas y guards)
├── app/layout/           # MainLayout, Header, Sidebar
├── pages/                # Páginas organizadas por ruta
│   ├── home/             # Landing page
│   ├── login/            # Inicio de sesión
│   ├── registro/         # Registro de usuario
│   ├── tracking/         # Rastreo público
│   ├── calculadora/      # Calculadora de tarifas
│   └── dashboard/        # Módulos del dashboard (paquetes, despachos, etc.)
├── components/           # Componentes reutilizables
│   ├── ui/               # Primitivos shadcn/ui
│   └── brand/            # Logo ECUBOX
├── hooks/                # Hooks de datos (queries/mutations)
├── stores/               # Zustand (auth, theme, ui)
├── lib/
│   ├── api/              # Cliente HTTP y servicios por dominio
│   └── pdf/              # Generación de PDFs
├── types/                # Tipos TypeScript por dominio
└── assets/brand/         # SVGs del logo
```

## Stack principal

- **UI:** React 19 + Radix UI (shadcn/ui) + Lucide React
- **Routing:** TanStack Router (type-safe)
- **Estado servidor:** TanStack Query v5
- **Estado cliente:** Zustand
- **Formularios:** React Hook Form + Zod
- **Estilos:** Tailwind CSS 4

## PWA, Service Worker y notificaciones

La app es instalable como PWA. El Service Worker se genera con
[`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) en modo `injectManifest`
a partir de [`src/sw.ts`](src/sw.ts), que conserva la lógica de Web Push.

Puntos clave:

- **Solo en producción:** el SW no se registra en `npm run dev`
  (ver `registerServiceWorker` en [`src/lib/pwa.ts`](src/lib/pwa.ts)).
- **Estrategia de caché:** precache del manifiesto de build (app shell + assets
  con hash) y navegación SPA servida desde `index.html` precacheado. Las
  peticiones a `/api/` nunca se cachean.
- **Actualizaciones (`registerType: 'prompt'`):** cuando hay una versión nueva,
  se muestra un toast "Hay una nueva versión disponible" con botón Actualizar;
  al confirmar se envía `SKIP_WAITING` y la página recarga. Esto evita servir
  chunks inconsistentes tras un deploy.
- **Cabeceras de caché (`Caddyfile`):** `/assets/*` es inmutable (hash por
  build); `sw.js`, `index.html` y `manifest.webmanifest` usan `no-cache` para
  revalidar en cada deploy.

### Notificaciones

- Las notificaciones del sistema se muestran **solo** vía
  `ServiceWorkerRegistration.showNotification` (nunca `new Notification`, que es
  ilegal en páginas controladas por un SW).
- Con la pestaña visible no se duplica el aviso del sistema (el usuario ya ve la
  campana); con suscripción Web Push activa, el servidor entrega los avisos.
- La activación está unificada en `useActivarNotificaciones`
  ([`src/hooks/useWebPush.ts`](src/hooks/useWebPush.ts)): pide permiso y, si hay
  sesión y el servidor tiene VAPID configurado, registra la suscripción push.

Web Push requiere en el backend `WEB_PUSH_ENABLED=true` y las claves VAPID
(`WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_SUBJECT`); ver
[Variables de entorno](../docs/despliegue/VARIABLES_ENTORNO.md).

### Recuperación tras un deploy

Si un usuario quedó con una versión cacheada inconsistente (antes de esta
migración del SW), basta con recargar; el nuevo SW limpia las cachés obsoletas
(`cleanupOutdatedCaches`). Como último recurso: DevTools → Application →
Service Workers → Unregister, o un hard refresh.

## Documentación detallada

- [UX-UI-DESIGN.md](../docs/desarrollo/UX-UI-DESIGN.md) — Sistema de diseño UX/UI
- [TECH-STACK.md](../docs/desarrollo/TECH-STACK.md) — Stack tecnológico completo
- [Variables de entorno](../docs/despliegue/VARIABLES_ENTORNO.md) — Ejemplos (`VITE_API_URL`, etc.)
