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

**Columna de peso:** usar `PesoCell` con las clases exportadas para ancho y alineación consistentes.

```tsx
import {
  PesoCell,
  PESO_TABLE_CELL_CLASS,
  PESO_TABLE_HEAD_CLASS,
} from '@/components/PesoCell';

<TableHead className={PESO_TABLE_HEAD_CLASS}>Peso</TableHead>
<TableCell className={PESO_TABLE_CELL_CLASS}>
  <PesoCell pesoLbs={p.pesoLbs} pesoKg={p.pesoKg} />
</TableCell>
```

- Formato estándar en tablas: **inline** (`3.00 lbs · 1.36 kg`), una sola línea con `whitespace-nowrap`.
- Variante `stacked` solo cuando el espacio vertical lo permita (p. ej. detalle fuera de columnas estrechas).
- Utilidades en `@/lib/utils/weight`: `formatWeightInline`, `formatWeightFromValues`, `normalizeWeight`.

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
import { KpiCardsGrid } from '@/components/KpiCardsGrid';

<KpiCardsGrid>
  <KpiCard
    icon={<Boxes className="h-5 w-5" />}
    label="Total"
    value={42}
    tone="primary"
    hint="Texto contextual opcional"
  />
</KpiCardsGrid>;
```

- Envuelve las tarjetas en `KpiCardsGrid` para un grid responsive uniforme (`auto-fill`).
- **Máximo 2-3 KPIs por listado**; usa 4 solo si todas las métricas son accionables.
  Prioriza métricas accionables (huecos por completar, vencidos, pendientes) sobre
  totales decorativos. No dupliques un dato que ya aparece en el `hint` de otra
  tarjeta, en los chips o en el `resumen` de `FiltrosBar`. Si un listado solo
  necesita un total, llévalo al `resumen` de `FiltrosBar` en vez de dejar una sola
  tarjeta. Mantén el `count` de `KpiCardsGridSkeleton` igual al número real de KPIs.
- Iconos en `h-5 w-5`; el badge del icono toma color según `tone`.
- Usa `hint` con contexto útil (promedios, porcentajes, desglose); admite hasta 2 líneas.
- Si no hay `hint`, no se muestra texto vacío: solo se reserva el espacio.
- Tonos: `primary`, `success`, `warning`, `danger`, `neutral`, `info`.

### Filtros de listado

`FiltrosBar` tiene **tres modos de layout** según las props que reciba:

| Modo | Props | UI |
|------|-------|-----|
| Solo chips | `chips` | Una banda compacta (p. ej. Guías master) |
| Solo filtros | `filtros` | Una banda con cabecera y grid de dropdowns, sin fila superior vacía |
| Combinado | `chips` + `filtros` | Chips arriba, separador, filtros abajo |

```tsx
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { ChipFiltro, ChipFiltroGroup } from '@/components/ChipFiltro';

<FiltrosBar
  chips={
    <ChipFiltroGroup>
      <ChipFiltro label="Todos" count={42} active tone="primary" onClick={...} />
      <ChipFiltro label="Vencidos" count={0} hideWhenZero ... />
    </ChipFiltroGroup>
  }
  filtros={
    <FiltroCampo label="Estado de rastreo">
      <SearchableCombobox ... />
    </FiltroCampo>
  }
  hayFiltrosActivos={tieneFiltros}
  onLimpiar={limpiarFiltros}
  filtrosActivosCount={n}
  resumen="16 paquetes"
/>;
```

- Chips arriba para filtros rápidos; dropdowns en **Filtros avanzados** (modo combinado) o **Filtros** (solo dropdowns) con grid `auto-fill`.
- Labels en `FiltroCampo` en sentence case (12px), sin MAYÚSCULAS.
- `resumen` va en la cabecera de filtros cuando hay `filtros`; si solo hay chips, al final de la fila de chips.
- `filtrosActivosCount` opcional para badge en cabecera de filtros.
- Usar `ChipFiltroGroup` cuando los chips son condicionales (`hideWhenZero`) o pasar `chips={undefined}` si no hay chips visibles.
- Skeleton: `FiltrosBarSkeleton` (`chips={0}` si no hay fila de chips).

### Diálogos de confirmación

`ConfirmDialog` global (`@/components/ConfirmDialog`). No duplicar en cada
módulo.

### Controles con presets

Componentes reutilizables para atajos operativos (fechas, cantidades, pesos,
guías masivas). Usar en formularios y diálogos donde el operario repite los
mismos valores.

#### `SegmentedControl` (`@/components/ui/segmented-control`)

Alterna entre dos o más modos mutuamente excluyentes (p. ej. Buscar / Pegar,
envío / guía master). Props: `value`, `onValueChange`, `options` con `value` y
`label` (ReactNode), `size` (`sm` | `md`).

```tsx
<SegmentedControl
  value={modo}
  onValueChange={setModo}
  options={[
    { value: 'buscar', label: 'Buscar' },
    { value: 'lista', label: 'Pegar lista' },
  ]}
/>
```

#### `QuickPresetChips` (`@/components/QuickPresetChips`)

Chips clicables para aplicar un valor predefinido sin escribir. Opciones desde
`@/lib/constants/operational-presets` o `@/lib/constants/manifiesto-presets`.

```tsx
import { QuickPresetChips } from '@/components/QuickPresetChips';
import { PRESETS_LBS, formatDatetimeLocalNow } from '@/lib/constants/operational-presets';

<QuickPresetChips
  options={PRESETS_LBS.map((p) => ({ label: p.label, value: p.valor }))}
  onSelect={(lbs) => setTotalLbs(String(lbs))}
/>

<QuickPresetChips
  options={[{ label: 'Ahora', value: 'now' }]}
  onSelect={() => setFecha(formatDatetimeLocalNow())}
/>
```

Con `react-hook-form`: `onSelect={(v) => setValue('cantidad', v, { shouldValidate: true })}`.
Filtrar presets por cupo o máximo (p. ej. `CANTIDAD_PRESETS` vs `MAX_PAQUETES`).

#### `PesoInput` / `PesoInputPair` (`@/components/PesoInput`)

Entrada numérica de peso con unidad visible (lbs / kg). Usar **`PesoInputPair`**
cuando ambas unidades se sincronizan; **`PesoInput`** para un solo campo.

- Valores alineados a la derecha, `font-mono tabular-nums`.
- Badge de unidad con acento al foco; borde y ring en el contenedor.
- Tamaños: `sm` (tablas), `md` (formularios), `lg` (diálogos destacados).
- `showHint` opcional: «Escribe en una unidad; la otra se calcula…».

```tsx
<PesoInputPair
  lbs={pesoLbs}
  kg={pesoKg}
  onLbsChange={handleLbs}
  onKgChange={handleKg}
  size="sm"
  highlight={valido}
  invalid={invalido}
  showHint
/>
```

En tablas de pesaje: una sola columna **Peso** con el par compacto, no dos columnas separadas.

#### `BulkGuiaInputPanel` (`@/components/BulkGuiaInputPanel`)

Panel unificado para pegar listas de guías o captura individual/escáner. Tabs
`lista` | `individual` (opcional con `showTabs={false}` solo lista). Conectar
`onProcessList` / `onProcessIndividual` a la búsqueda API existente.

```tsx
<BulkGuiaInputPanel
  tab={tab}
  onTabChange={setTab}
  listValue={text}
  onListChange={setText}
  individualValue={individual}
  onIndividualChange={setIndividual}
  onProcessList={handleBuscar}
  onProcessIndividual={handleAgregarUna}
  listButtonLabel="Verificar guías"
  showTabs={false}
/>
```

#### `DistribucionSacasPanel` (`@/components/DistribucionSacasPanel`)

Reparto de piezas entre sacas con presets y validación de totales (despachos).
Usar en flujos de armado de saca cuando ya exista lógica de distribución en la
página; no duplicar textarea + botones sueltos.

**Reglas:** mantener labels en sentence case; presets en constantes compartidas;
no mezclar con `Button variant="outline"` duplicados para el mismo atajo.

---

## 3.5 Validación de formularios

Reglas transversales para todos los formularios del panel operario y admin:

### Schemas centralizados

- Definir reglas en `@/lib/schemas/` (primitives + dominio), alineadas con los DTOs
  del backend (`@Size`, `@NotBlank`, `@AssertTrue`).
- Importar desde `@/lib/schemas` o submódulos (`@/lib/schemas/despacho`, etc.).
- No duplicar `refine` de tipo de entrega, límites de guías bulk (500 × 120 chars)
  ni notas (4000) en cada página.

### Errores en UI

| Situación | Patrón |
|-----------|--------|
| Campo de formulario RHF | `FormMessage` / `LabeledField` con `error`; `mode: 'onTouched'` |
| Lista bulk de guías | `validateGuiaList()` + banner en `BulkGuiaInputPanel` (`validationError`, contador `N/500`) |
| Grid operativo (pesaje) | `validateBulkPeso()` + borde/tooltip por fila inválida |
| Submit fallido por regla de negocio | `form.setError()` o banner inline, **no** `toast.error` |
| Error de red / API | `toast.error` o `notify.error` en `catch` |

### Utilidades frecuentes

```tsx
import { validateGuiaList, parseGuiaList } from '@/lib/schemas/bulk-guias';
import { despachoCreateSchema } from '@/lib/schemas/despacho';
import { validateBulkPeso } from '@/lib/schemas/pesaje';
import { liquidacionCrearSchema } from '@/lib/schemas/liquidacion';
```

### Tests

Añadir casos críticos en `src/lib/schemas.test.ts` al introducir reglas nuevas
(tipo entrega, bulk 100/500, motivo 500, notas 4000).

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
- [ ] KPIs con `KpiCardsGrid` + `KpiCard`
- [ ] Filtros con `FiltrosBar` + `ChipFiltro` + `FiltroCampo`
- [ ] Listas con `Table` + `ListTableShell`
- [ ] Estados: `LoadingState`, `EmptyState`, `ui-alert ui-alert-error`
- [ ] Badges de estado: `StatusBadge` o `DomainStatusBadge`
- [ ] Sin colores Tailwind crudos
- [ ] Sin `<h1>`/`<h2>` ad-hoc — usa `PageHeader`/`FormSection`
