# Guía de UI ECUBOX

Esta guía resume las convenciones que sigue el frontend de ECUBOX para mantener
una identidad visual y experiencia consistentes en todas las páginas (públicas y
del dashboard interno). Su objetivo es servir como referencia rápida cuando se
crea o modifica una página o componente.

---

## 1. Tokens de diseño (`src/index.css`)

Todos los colores, radios, sombras y tipografías se exponen como variables CSS:

| Token                              | Uso                                    |
| ---------------------------------- | -------------------------------------- |
| `--color-primary`                  | Color de marca primario                |
| `--color-success`                  | Estados positivos / confirmaciones     |
| `--color-warning`                  | Avisos, advertencias                   |
| `--color-info`                     | Mensajes neutros / informativos        |
| `--color-destructive`              | Errores, acciones destructivas         |
| `--color-foreground`               | Texto principal                        |
| `--color-muted-foreground`         | Texto secundario                       |
| `--color-border`                   | Bordes neutros                         |
| `--color-card`                     | Fondo de tarjetas                      |
| `--color-background`               | Fondo de página                        |
| `--color-ecubox-acento`            | Acento ECUBOX (azul intenso)           |
| `--color-ecubox-acento-claro`      | Acento ECUBOX claro                    |
| `--color-landing-*`                | Tokens específicos para landing/público |

> **Regla**: nunca uses colores literales de Tailwind como `bg-emerald-500`,
> `text-amber-600`, `border-red-200` ni hex (`#5B9CFF`) en componentes de
> aplicación. Usa siempre los tokens.

### Utilidades semánticas

- `.ui-alert` + `.ui-alert-{success|warning|error|info}` — bloques de aviso.
- `.brand-gradient-text` — gradiente ECUBOX para títulos o highlights.
- `.brand-gradient-bg` — fondo gradiente para banners promocionales.
- `.page-stack` — contenedor flex vertical responsive (gap 1rem → 1.5rem).
- `.landing-shell`, `.landing-overlay`, `.landing-card`, `.landing-card-elevated`,
  `.landing-card-muted`, `.landing-text`, `.landing-text-muted`, `.landing-chip`
  — set específico para páginas públicas.

---

## 2. Layout

- **Dashboard**: las páginas se renderizan dentro de `MainLayout` que ya provee
  `Sidebar`, `Header` y `page-shell` (ancho máximo 1720px). El root del page
  debe ser un `<div className="page-stack">` para mantener el ritmo vertical.
- **Públicas (landing, tracking, calculadora, login, registro)**: usar
  `landing-shell` + `landing-overlay` + `<SiteHeader>` + `<SiteFooter>`.
  - `<SiteHeader variant="default">` para landing.
  - `<SiteHeader variant="auth">` para login/registro.
  - `<SiteHeader variant="tool">` para tracking/calculadora.

---

## 3. Componentes canónicos

### Encabezados

```tsx
import { PageHeader } from '@/components/PageHeader';

<PageHeader
  icon={<Boxes className="h-5 w-5" />}
  title="Mis guías"
  description="Resumen de tus envíos."
  actions={<Button>Nueva guía</Button>}
/>;
```

Variantes: `list` (por defecto, dentro de `SurfaceCard`), `detail` (sin tarjeta),
`public` (`landing-card`).

### Tarjetas

```tsx
import { SurfaceCard } from '@/components/ui/surface-card';

<SurfaceCard className="p-4">…</SurfaceCard>;
```

> **No** uses `className="surface-card"` directamente. Siempre el componente.

### Secciones de formulario

```tsx
import { FormSection } from '@/components/FormSection';

<FormSection title="Datos de contacto" description="Información del cliente.">
  …
</FormSection>;
```

### Campos etiquetados

```tsx
import { LabeledField } from '@/components/LabeledField';

<LabeledField label="Nombre" required hint="Tal como aparece en cédula.">
  <Input />
</LabeledField>;
```

> Los `FormField` locales que existían en cada página fueron consolidados aquí.

### Estados de carga / vacío / error

- `LoadingState` (variantes `page` y `inline`).
- `EmptyState` con icono, título y CTA.
- Errores → bloque `ui-alert ui-alert-error` (no styles ad-hoc).

### Tablas

Siempre usar `Table` de `@/components/ui/table` envuelto en `ListTableShell`.
Para listas con scroll horizontal añadir `min-w-[…]`.

### Estados de dominio (badges)

```tsx
import { StatusBadge, DomainStatusBadge } from '@/components/ui/StatusBadge';

<StatusBadge tone="success">Entregado</StatusBadge>
<DomainStatusBadge status="EN_TRANSITO" /> {/* tono resuelto automáticamente */}
```

Tonos disponibles: `success`, `info`, `warning`, `error`, `primary`, `neutral`.
Variante `solid` para badges con fondo lleno.

### KPI / Métricas

```tsx
import { KpiCard } from '@/components/KpiCard';

<KpiCard icon={<Boxes className="h-5 w-5" />} label="Total" value={42} tone="primary" />;
```

Tonos: `primary`, `success`, `warning`, `danger`, `neutral`.

### Diálogos de confirmación

`ConfirmDialog` global (`@/components/ConfirmDialog`). No duplicar en cada
módulo.

---

## 4. Identidad pública

Las páginas públicas comparten el lenguaje "landing":

- Header → `<SiteHeader variant="…">`.
- Footer → `<SiteFooter />`.
- Contenedor → `landing-shell` con `landing-overlay`.
- Tarjetas → `landing-card` / `landing-card-elevated` / `landing-card-muted`.
- Texto → `landing-text` / `landing-text-muted`.
- Highlights / chips → `landing-chip`.
- Títulos hero → `responsive-title` + `brand-gradient-text` cuando aplica.

---

## 5. Reglas rápidas

1. **No hex sueltos**: usa tokens (`var(--color-*)`).
2. **No `bg-amber-500` ni similares**: usa tokens semánticos.
3. **Header de página** → siempre `PageHeader` o `ListToolbar` (que internamente
   delega en `PageHeader`).
4. **Errores inline** → `<div className="ui-alert ui-alert-error">…</div>`.
5. **Espaciado vertical raíz** → `page-stack` en lugar de `space-y-4`.
6. **Public pages** → siempre `SiteHeader` + `SiteFooter` + `landing-shell`.
7. **Formularios** → `FormSection` + `LabeledField`.
8. **Botones** → `@/components/ui/button` con sus variantes.
9. **Iconografía** → `lucide-react`.
10. **Dark mode**: las variables ya están definidas, no agregues clases
    `dark:*` específicas para colores semánticos.

---

## 6. Checklist al crear una página nueva

- [ ] Root: `<div className="page-stack">` (dashboard) o `landing-shell` (público)
- [ ] Header: `PageHeader` / `ListToolbar` (dashboard) o `SiteHeader` (público)
- [ ] Acciones primarias arriba a la derecha del header
- [ ] Filtros agrupados en `SurfaceCard` (dashboard)
- [ ] KPIs con `KpiCard`
- [ ] Listas con `Table` + `ListTableShell`
- [ ] Estados: `LoadingState`, `EmptyState`, `ui-alert ui-alert-error`
- [ ] Badges de estado: `StatusBadge` o `DomainStatusBadge`
- [ ] Sin colores Tailwind crudos
- [ ] Sin `<h1>`/`<h2>` ad-hoc — usa `PageHeader`/`FormSection`
