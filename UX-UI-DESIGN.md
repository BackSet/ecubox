# Candas — Diseño UX/UI

Documento de referencia del diseño de experiencia de usuario (UX) e interfaz (UI) del frontend Candas. Describe el sistema de diseño, el layout global, los patrones de página y los componentes utilizados.

---

## 1. Introducción

**Propósito:** Este documento detalla las decisiones de diseño UX/UI del proyecto Candas para mantener consistencia y servir de guía a desarrolladores y diseñadores.

**Alcance:** Aplica al frontend (`candas-frontend`), construido con React 19, TypeScript, Vite 7 y Tailwind CSS 4. No cubre el backend ni otros clientes.

---

## 2. Sistema de diseño

### 2.1 Tema visual

- **Inspiración:** Estética tipo Notion: fondos neutros, bordes suaves, tipografía legible y jerarquía clara.
- **Modos:** Modo claro y modo oscuro, controlados por el usuario desde el sidebar (toggle Sol/Luna). Las variables CSS cambian según la clase `.dark` en el contenedor.

Referencia: `candas-frontend/src/index.css` (capas `@layer base` con `:root` y `.dark`).

### 2.2 Colores semánticos

Los colores se definen como variables HSL sin el prefijo `hsl()`; Tailwind las usa vía `@theme` en `index.css`:

| Variable | Uso |
|----------|-----|
| `--background` / `--foreground` | Fondo principal y texto principal |
| `--card` / `--card-foreground` | Tarjetas y contenido en cards |
| `--popover` / `--popover-foreground` | Popovers y menús desplegables |
| `--primary` / `--primary-foreground` | Botones principales, enlaces, elemento activo del sidebar |
| `--secondary` / `--secondary-foreground` | Botones secundarios, fondos hover |
| `--muted` / `--muted-foreground` | Fondos suaves, texto secundario |
| `--accent` / `--accent-foreground` | Acentos y hover |
| `--destructive` / `--destructive-foreground` | Acciones destructivas (ej. eliminar) |
| `--border` | Bordes generales |
| `--input` | Bordes de inputs |
| `--ring` | Anillo de foco |
| `--error` / `--error-foreground` | Errores de validación |
| `--success` / `--success-foreground` | Estados de éxito |
| `--warning` / `--warning-foreground` | Advertencias |
| `--info` / `--info-foreground` | Información |
| `--sidebar-*` | Sidebar: background, foreground, muted, hover, active, active-foreground, border |

**Modo claro (resumen):** Fondo blanco (`#FFFFFF`), texto principal `#37352F`, secundario `#F7F6F3`, bordes `#E9E9E6`.

**Modo oscuro:** Fondo `#2F3437`, texto `#EBECED`, secundario `#3F4447`, bordes `#464A4D`.

### 2.3 Tipografía

- **Familia:** `Inter`, con fallback a `system-ui`, `-apple-system`, `sans-serif` (variable `--font-sans`).
- **Ajustes:** `font-feature-settings: 'cv11', 'ss01'` y `font-variation-settings: 'opsz' 32` para mejor legibilidad.
- **Tamaños habituales:** `text-xs`, `text-sm`, `text-[13px]` (sidebar y listas), `text-lg`, `text-xl`, `text-3xl` (títulos).
- **Pesos:** `font-medium`, `font-semibold`, `font-bold` para jerarquía.

### 2.4 Espaciado y bordes

- **Radios:** `--radius` (0.375rem), `--radius-lg` (8px), `--radius-md` (6px), `--radius-sm` (4px). Botones y cards suelen usar `rounded-md` o `rounded-lg`.
- **Bordes:** Color `border-border`, a menudo con opacidad (`border-border/40`, `border-sidebar-border/60`).

### 2.5 Utilidades tipo Notion

En `index.css` se definen clases de utilidad:

- **`.notion-border`:** `border border-border`.
- **`.notion-card`:** `bg-background border border-border rounded-lg`.
- **`.notion-table`:** Tabla con `w-full border-collapse`; cabeceras `text-left text-xs font-medium text-muted-foreground px-3 py-2 border-b border-border`; celdas `px-3 py-2 text-sm border-b border-border/50`; filas con `hover:bg-muted/50`.

### 2.6 Clases condicionales

Se usa la utilidad `cn()` (en `lib/utils.ts`: `clsx` + `tailwind-merge`) para combinar clases de forma condicional y evitar conflictos entre estilos de Tailwind.

---

## 3. Layout global

Estructura principal en `MainLayout.tsx`: pantalla completa en flex, sin scroll en el contenedor raíz.

### 3.1 Estructura general

```
┌─────────────────────────────────────────────────────────┐
│  Sidebar (colapsable)  │  Header (barra fija)          │
│                        ├────────────────────────────────┤
│  - Logo "Candas"       │                                │
│  - Buscar (⌘K)         │  Main (Outlet, scroll interno) │
│  - Navegación          │                                │
│  - Toggle tema         │                                │
└────────────────────────┴────────────────────────────────┘
```

- **Sidebar:** Ancho `240px` expandido, `52px` colapsado; transición `duration-200 ease-out`. Borde derecho `border-r border-sidebar-border/60`.
- **Área principal:** `flex-1 flex-col min-w-0`; dentro, Header fijo y `<main>` con `flex-1 min-h-0 overflow-y-auto`, padding `p-4 md:p-6 lg:p-8`.

### 3.2 Sidebar

- **Header:** Botón con logo "C" en cuadrado redondeado con gradiente primary, nombre "Candas" y subtítulo "Sistema de Gestión". Botón para colapsar/expandir (chevrones).
- **Buscar:** Botón que abre la Command Palette; texto "Buscar", atajo `⌘K` visible cuando está expandido.
- **Navegación:** Secciones con título en mayúsculas y tracking amplio (Gestión, Logística, Operaciones, Admin). Cada ítem: icono Lucide (24px), texto, estado activo con `bg-primary/10 text-primary font-semibold`. Enlaces protegidos por permisos (`ProtectedByPermission`).
- **Footer:** Toggle tema (Sol/Luna) y etiqueta "Modo Claro" / "Modo Oscuro".
- **Píldora de colapso:** Botón absoluto a la derecha del sidebar (`-right-3`), visible al hover; alterna entre chevron izquierdo/derecho.

Archivo: `candas-frontend/src/app/layout/Sidebar.tsx`.

### 3.3 Header

- **Barra:** `sticky top-0 z-40`, altura `h-12`, `border-b border-border/40`, `bg-background/80 backdrop-blur-xl`.
- **Búsqueda global:** Input de solo lectura que abre la Command Palette al hacer clic o con ⌘K/Ctrl+K; placeholder "Buscar paquetes, navegar..."; icono lupa y tecla ⌘K a la derecha.
- **Acciones:** Botón de notificaciones (icono campana), menú de usuario (avatar con iniciales del username, dropdown con nombre, email, roles en badges y opción "Cerrar Sesión").

Archivo: `candas-frontend/src/app/layout/Header.tsx`.

### 3.4 Toaster y Command Palette

- **Toaster:** Sonner con `position="top-right"` y `richColors` para feedback de éxito/error/aviso tras acciones.
- **Command Palette:** Diálogo tipo cmdk; búsqueda de paquetes (por guía) y secciones de navegación rápida (Dashboard, Paquetes, etc.). Atajo global ⌘K / Ctrl+K.

Archivos: `MainLayout.tsx` (Toaster), `GlobalCommandPalette.tsx` (Command Palette).

---

## 4. Patrones de página

### 4.1 Listados

- **ListToolbar:** Barra superior con búsqueda (icono Search, input con debounce ~300 ms, botón limpiar), filtros opcionales, botón "Filtros avanzados" colapsable y zona de acciones (botones Crear, Importar, etc.).
- **Tabla:** Estilos tipo Notion (`.notion-table` o clases equivalentes): cabeceras en `text-xs font-medium text-muted-foreground`, filas con hover, bordes discretos.
- **Paginación:** Componente de paginación reutilizable (ej. `ListPagination`) al pie del listado.
- **Estados vacío y carga:** `EmptyState` (icono, título "Sin resultados", descripción opcional, acción opcional) y `LoadingState` (spinner, texto "Cargando...") para listas y páginas.

Archivos: `ListToolbar.tsx`, `EmptyState.tsx`, `LoadingState.tsx`.

### 4.2 Páginas de detalle

- **DetailPageLayout:** Contenedor con cabecera fija (borde inferior, fondo con blur) y área de contenido con scroll.
- **DetailHeader:** Botón "Volver" (ArrowLeft), título (h1, `text-xl sm:text-3xl font-bold`), opcional subtítulo, `StatusBadge` y bloque de acciones a la derecha.
- **Contenido:** Ancho máximo configurable: `md` (max-w-3xl), `lg` (max-w-4xl), `xl` (max-w-5xl), `2xl` (max-w-6xl), `full` (sin límite). Espaciado vertical entre secciones (`space-y-8`).
- **Secciones:** Títulos con `SectionTitle` en variante `detail` (texto pequeño, mayúsculas, tracking, muted) o `form` (texto más grande, borde inferior). Tarjetas de información con `InfoCard`, enlaces a entidades relacionadas con `RelatedEntityLink` o `RelatedEntities`.

Archivos: `DetailPageLayout.tsx`, `DetailHeader.tsx`, `SectionTitle.tsx`, `StatusBadge.tsx`.

### 4.3 Formularios

- **Estructura:** Secciones delimitadas por `SectionTitle` (variante `form`), grupos de campos con Label, Input/Select/Textarea/Checkbox, y `FormError` para mensajes de validación.
- **Validación:** Esquemas Zod y React Hook Form con `zodResolver`; feedback en línea y/o toasts.
- **Pies de formulario:** Botones primario (Guardar/Crear) y secundario u outline (Cancelar/Volver), típicamente en `DialogFooter` o barra fija al pie.

---

## 5. Componentes UI y patrones

### 5.1 Radix UI

Componentes headless estilizados con Tailwind:

- **Dialog:** Modal con overlay oscuro (`bg-black/20`), contenido centrado, animaciones de entrada/salida (fade, zoom), botón cerrar (X) en esquina.
- **DropdownMenu:** Menús desplegables alineados (ej. `align="end"`), bordes redondeados, separadores.
- **Select, Checkbox, Accordion, Tabs, ScrollArea, Alert:** Uso consistente con variables de tema (border, muted, etc.).

### 5.2 Botones

Variantes (CVA en `button.tsx`):

- **default:** Fondo primary, texto primary-foreground, sin sombra, borde transparente.
- **destructive:** Fondo y texto destructive.
- **outline:** Borde border, fondo background, hover secondary.
- **secondary:** Fondo secondary.
- **ghost:** Solo hover secondary.
- **link:** Estilo enlace con subrayado en hover.

Tamaños: `default` (h-9), `sm` (h-8, text-xs), `lg` (h-10), `icon` (h-9 w-9). Focus visible: `ring-1 ring-ring`.

### 5.3 Badges y StatusBadge

- **Badge:** Variantes estándar (default, secondary, outline, destructive, etc.).
- **StatusBadge:** Variantes semánticas con colores del sistema: `active`/`completed` (success), `in-progress` (info), `pending` (warning), `error` (error), `inactive` (muted). Opcional icono Lucide.

### 5.4 Diálogos

Patrón: `Dialog` > `DialogContent` (max-w-lg por defecto) > `DialogHeader` (DialogTitle, DialogDescription) > contenido > `DialogFooter` (botones). Overlay con transición; botón cerrar accesible y `sr-only` para lectores de pantalla.

### 5.5 Estados de interfaz

- **EmptyState:** Contenedor con borde dashed, fondo muted/5, icono en círculo (por defecto Inbox), título, descripción opcional y acción opcional.
- **LoadingState:** Variantes `page` (bloque centrado con spinner y texto) e `inline` (fila con spinner y etiqueta).
- **ErrorState:** Para mostrar errores de carga o permisos (uso en rutas o bloques de error).

---

## 6. Feedback y accesibilidad

### 6.1 Feedback

- **Toasts:** Sonner para confirmaciones (éxito), errores de API o validación y avisos. Posición fija top-right.
- **Carga:** LoadingState en listados y formularios; posible deshabilitar botones durante submit.
- **Validación:** Mensajes junto a campos (FormError) y, si aplica, resumen en toast.

### 6.2 Atajos de teclado

- **⌘K / Ctrl+K:** Abre/cierra la Command Palette (Header y Sidebar). Esc cierra el diálogo.

### 6.3 Accesibilidad

- **Sidebar:** Botones con `aria-label` ("Expandir sidebar", "Colapsar sidebar"); ítems colapsados con `title` con el nombre del ítem.
- **Header:** Botones con `aria-label` ("Notifications", "User menu"); menú de usuario con estructura clara (nombre, email, roles, Cerrar sesión).
- **Diálogos:** Botón cerrar con texto `sr-only` "Close"; Radix expone títulos y descripciones para lectores de pantalla.
- **Búsqueda:** Placeholder y etiquetas coherentes para identificar la función del campo.

---

## 7. Scrollbars y detalles

- **WebKit (Chrome, Safari, Edge):** Scrollbar 8px, track con `--muted`, thumb con `--border` y borde para separar del track; hover del thumb más oscuro. Clase `.no-scrollbar` oculta scrollbar manteniendo scroll.
- **Firefox:** `scrollbar-width: thin`; `scrollbar-color` con variables del tema.
- **Modo oscuro:** Thumb más visible (opacidad de `muted-foreground`).
- **Calendario:** En dark, el indicador del date picker nativo se invierte (`filter: invert(1)`) para contraste.

Definido en `index.css` (capas base y utilities).

---

## 8. Resumen técnico

| Categoría | Tecnología |
|-----------|------------|
| Estilos | Tailwind CSS 4, variables CSS (`@theme`), PostCSS |
| Componentes base | Radix UI (Dialog, Dropdown, Select, Checkbox, Accordion, Tabs, ScrollArea, Alert, etc.) |
| Iconos | Lucide React |
| Toasts | Sonner |
| Command Palette | cmdk (CommandDialog) |
| Variantes de componentes | class-variance-authority (CVA) |
| Clases condicionales | clsx + tailwind-merge (utilidad `cn`) |
| Formularios | React Hook Form, Zod, @hookform/resolvers |
| Routing | TanStack Router (rutas tipadas) |

Las versiones exactas y la lista completa de dependencias se encuentran en `candas-frontend/package.json`. Los archivos de componentes y layout citados están bajo `candas-frontend/src/`.
