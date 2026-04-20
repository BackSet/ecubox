# ECUBOX — Diseño UX/UI

Documento de referencia del diseño de experiencia de usuario (UX) e interfaz (UI) del frontend ECUBOX. Describe el sistema de diseño, el layout global, los patrones de página y los componentes utilizados.

---

## 1. Introducción

**Propósito:** Detalla las decisiones de diseño UX/UI del proyecto ECUBOX para mantener consistencia y servir de guía a desarrolladores.

**Alcance:** Aplica al frontend (`ecubox-frontend`), construido con React 19, TypeScript 6, Vite 8 y Tailwind CSS 4.

---

## 2. Sistema de diseño

### 2.1 Tema visual

- **Estética:** Fondos neutros, bordes suaves, tipografía legible y jerarquía clara. Marca ECUBOX con gradientes azul-púrpura.
- **Modos:** Modo claro y modo oscuro, controlados por el usuario (toggle Sol/Luna/Monitor en sidebar y header público). Las variables CSS cambian según la clase `.dark`.
- **Inicialización:** El tema se aplica desde `main.tsx` (antes del render) para evitar FOUC.

Referencia: `ecubox-frontend/src/index.css`, `ecubox-frontend/src/stores/themeStore.ts`.

### 2.2 Tokens de color

Los colores se definen como variables CSS en `:root` (light) y `.dark` (dark) en `index.css`. Grupos principales:

**Tokens base (shadcn):**

| Variable | Uso |
|----------|-----|
| `--color-background` / `--color-foreground` | Fondo y texto principal |
| `--color-card` / `--color-card-foreground` | Tarjetas |
| `--color-primary` / `--color-primary-foreground` | Acciones principales, enlaces |
| `--color-secondary` / `--color-secondary-foreground` | Botones secundarios |
| `--color-muted` / `--color-muted-foreground` | Fondos suaves, texto secundario |
| `--color-accent` / `--color-accent-foreground` | Hover, acentos |
| `--color-destructive` / `--color-destructive-foreground` | Acciones destructivas |
| `--color-border` / `--color-input` / `--color-ring` | Bordes, inputs, foco |

**Tokens de marca ECUBOX:**

| Variable | Uso |
|----------|-----|
| `--color-ecubox-blue` | Azul primario de la marca |
| `--color-ecubox-purple` | Púrpura de la marca |
| `--color-ecubox-navy` | Azul oscuro para textos |

**Tokens por zona de la UI:**

| Grupo | Ejemplo de variables | Uso |
|-------|---------------------|-----|
| `--color-sidebar-*` | background, foreground, hover, active, border | Sidebar del dashboard |
| `--color-topbar-*` | background, foreground, search-bg, border | Header del dashboard |
| `--color-landing-*` | bg, text, card, card-muted, border | Páginas públicas |
| `--color-command-*` | surface, border, input-bg, item-text, item-hover | Command palette |
| `--color-popover*` | popover, popover-foreground | Popovers y dropdowns |

**Tokens semánticos:**

| Variable | Uso |
|----------|-----|
| `--color-error` / `--color-error-foreground` | Errores |
| `--color-success` / `--color-success-foreground` | Éxito |
| `--color-warning` / `--color-warning-foreground` | Advertencias |
| `--color-info` / `--color-info-foreground` | Información |

### 2.3 Tipografía

- **Familia:** `Inter`, con fallback a `system-ui`, `-apple-system`, `sans-serif`.
- **Tamaños habituales:** `text-xs`, `text-sm`, `text-[13px]` (sidebar), `text-lg`, `text-xl`, `text-3xl` (títulos).
- **Pesos:** `font-medium`, `font-semibold`, `font-bold`.

### 2.4 Espaciado y bordes

- **Radios:** `--radius` (0.375rem), `--radius-lg`, `--radius-md`, `--radius-sm`.
- **Sombras:** `--shadow-soft` y `--shadow-elevated` con valores diferenciados para light y dark.

### 2.5 Clases de utilidad

Definidas en `index.css`:

- **`surface-card`:** Tarjeta con fondo, borde y sombra del tema.
- **`ui-alert-*`:** Alertas semánticas (info, success, warning, error).
- **`landing-shell`:** Fondo de la landing page.
- **`landing-text` / `landing-text-muted`:** Texto en páginas públicas.
- **`landing-chip` / `landing-card`:** Elementos de la landing.
- **`dashboard-topbar`:** Barra superior del dashboard.
- **`command-surface` / `command-item`:** Command palette.

### 2.6 Clases condicionales

Se usa la utilidad `cn()` (en `lib/utils.ts`: `clsx` + `tailwind-merge`) para combinar clases de forma condicional.

---

## 3. Layout global

Estructura principal en `MainLayout.tsx`: pantalla completa en flex.

### 3.1 Estructura general

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (colapsable)  │  Header (barra fija)           │
│                        ├────────────────────────────────┤
│  - Logo "ECUBOX"       │                                │
│  - Buscar (⌘K)         │  Main (Outlet, scroll interno) │
│  - Navegación          │                                │
│  - Toggle tema         │                                │
└────────────────────────┴────────────────────────────────┘
```

- **Sidebar:** Ancho `220px` expandido, `52px` colapsado; transición `duration-200 ease-out`.
- **Área principal:** `flex-1 flex-col min-w-0`; dentro, Header fijo y `<main>` con scroll.

### 3.2 Sidebar

- **Header:** Logo ECUBOX: cuando expandido muestra wordmark "ECUBOX" (SVG), cuando colapsado muestra isotipo "E" (SVG). Hover con transición de opacidad.
- **Buscar:** Botón que abre la Command Palette; texto "Buscar", atajo `⌘K`.
- **Navegación:** Secciones agrupadas (Principal, Operaciones, Catálogos, Administración, Configuración). Cada ítem: icono Lucide, texto, estado activo con `bg-primary/10 text-primary font-semibold`. Visibilidad controlada por permisos.
- **Footer:** Toggle tema (Sol/Luna/Monitor).
- **Colapso:** Botón circular en el borde derecho, visible al hover.

Archivo: `ecubox-frontend/src/app/layout/Sidebar.tsx`.

### 3.3 Header

- **Barra:** `sticky top-0`, altura `h-12`, fondo con blur.
- **Búsqueda global:** Botón que abre la Command Palette al hacer clic o con ⌘K/Ctrl+K.
- **Acciones:** Menú de usuario (avatar con iniciales, dropdown con nombre, email, roles y "Cerrar Sesión").

Archivo: `ecubox-frontend/src/app/layout/Header.tsx`.

### 3.4 Command Palette y Toaster

- **Command Palette:** Diálogo cmdk; búsqueda de paquetes (por guía) y navegación rápida. Atajo global ⌘K/Ctrl+K. Estilos con tokens `command-*` para consistencia dark/light.
- **Toaster:** Sonner con `position="top-right"` y `richColors`.

Archivos: `GlobalCommandPalette.tsx`, `MainLayout.tsx`.

---

## 4. Páginas públicas

### 4.1 Landing (HomePage)

- **SiteHeader:** Logo ECUBOX, enlaces de navegación (Rastreo, Tarifas), toggle tema, botones login/registro. Menú móvil responsive.
- **Hero:** Título, subtítulo, CTAs (Empezar envío, Calculadora).
- **ServicesGrid:** Tarjetas con iconos Lucide (Package, MapPin, Zap).
- **FAQ:** Acordeón con preguntas frecuentes.
- **SiteFooter:** Logo, enlaces de servicios y cuenta, copyright.

Fondo con `landing-shell` y `landing-overlay` (radial gradient sutil).

### 4.2 Login y Registro

- **LoginPage:** Formulario con correo electrónico y contraseña. Validación Zod. Componentes shadcn (Input, Button, SurfaceCard).
- **RegistroSimplePage:** Formulario de registro con campos y validación.

---

## 5. Patrones de página (dashboard)

### 5.1 Listados

- **ListToolbar:** Barra con búsqueda (Input con debounce), filtros y acciones.
- **ListTableShell:** Contenedor SurfaceCard para tablas.
- **Tabla:** Componentes shadcn Table con cabeceras en `text-xs font-medium text-muted-foreground`.
- **Estados:** EmptyState (icono, título, acción) y LoadingState (spinner).

### 5.2 Formularios

- Secciones con `SectionTitle`, campos con Label/Input/Select/Textarea.
- Validación: esquemas Zod + React Hook Form con `zodResolver`.
- Feedback: toasts (Sonner) + mensajes en línea.

### 5.3 Formularios multi-paso (Stepper)

Usado en Despachos: navegación por pasos con botones, campos dependientes (ej. seleccionar Courier de entrega antes de Punto de entrega), estados deshabilitados hasta cumplir prerequisitos.

---

## 6. Componentes UI

### 6.1 Primitivos (shadcn/ui + Radix)

- **Button:** Variantes default, destructive, outline, secondary, ghost, link. Tamaños default/sm/lg/icon.
- **Input / Textarea / Select:** Estilos unificados con bordes, radios y estados focus/disabled consistentes.
- **Dialog:** Overlay oscuro, contenido centrado, animaciones, botón cerrar.
- **SurfaceCard:** Tarjeta reutilizable con fondo, borde y sombra del tema.

### 6.2 Feedback

- **Toasts:** Sonner (top-right, richColors).
- **Alertas:** Clases `ui-alert-*` (info, success, warning, error).
- **Loading:** LoadingState con spinner y texto.

### 6.3 Accesibilidad

- Botones con `aria-label` descriptivos.
- Diálogos con títulos accesibles (Radix).
- Atajo de teclado ⌘K/Ctrl+K para Command Palette.

---

## 7. Marca (Brand)

### 7.1 Logo

- **Wordmark:** SVG con texto "ECUBOX" (ECU en azul navy/claro, BOX en púrpura). Sin icono gráfico en el wordmark.
- **Isotipo (mark):** Letra "E" estilizada con gradiente azul-púrpura, sin fondo. Para sidebar colapsado y favicons.
- **Favicons:** Isotipo "E" con fondo redondeado (para visibilidad en pestañas). Versiones light, dark y default.

Componente: `ecubox-frontend/src/components/brand/EcuboxLogo.tsx`.
Assets: `ecubox-frontend/src/assets/brand/`.

### 7.2 Comportamiento del logo

- `iconOnly={false}` (default): muestra wordmark "ECUBOX".
- `iconOnly={true}`: muestra isotipo "E" (sidebar colapsado).
- Selección automática de versión light/dark según el tema activo.
- Hover con transición de opacidad (sin rectángulo de fondo).

---

## 8. Resumen técnico

| Categoría | Tecnología |
|-----------|------------|
| Estilos | Tailwind CSS 4, variables CSS, PostCSS |
| Componentes base | Radix UI (Dialog, Dropdown, Select, Accordion, etc.) |
| Iconos | Lucide React 1.7.x |
| Toasts | Sonner |
| Command Palette | cmdk |
| Variantes | class-variance-authority (CVA) |
| Clases condicionales | clsx + tailwind-merge (`cn`) |
| Formularios | React Hook Form + Zod |
| Routing | TanStack Router (type-safe) |

Las versiones exactas están en `ecubox-frontend/package.json`. Los archivos de componentes y layout están bajo `ecubox-frontend/src/`.
