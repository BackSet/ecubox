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

## 1.5 Sistema de movimiento (motion)

El movimiento es funcional: confirma acciones, preserva continuidad espacial y
evita cambios bruscos. Nunca decorativo ni constante.

### Tokens (`src/index.css`, en `:root`)

| Token | Valor | Uso |
| --- | --- | --- |
| `--motion-instant` | `0ms` | sin animación (acciones de teclado) |
| `--motion-fast` | `120ms` | feedback de botón, color/hover, controles |
| `--motion-normal` | `180ms` | dropdowns, selects, popovers, entradas |
| `--motion-slow` | `240ms` | superficies, expansión de filtros, highlight |
| `--motion-emphasis` | `300ms` | diálogos, drawers |
| `--motion-ease-standard` | `cubic-bezier(0.4,0,0.2,1)` | color/hover |
| `--motion-ease-enter` | `cubic-bezier(0.23,1,0.32,1)` | entradas (ease-out fuerte) |
| `--motion-ease-exit` | `cubic-bezier(0.4,0,1,1)` | salidas (rápidas) |
| `--motion-ease-emphasized` | `cubic-bezier(0.77,0,0.175,1)` | movimiento/morph en pantalla |

> **Regla**: no uses `transition-all` ni duraciones literales (`duration-200`,
> `300ms`) dispersas. Usa los tokens o las utilidades de abajo.

### Utilidades semánticas

| Clase | Efecto |
| --- | --- |
| `.ui-transition` | transición canónica de controles (color + presión), `--motion-fast` |
| `.ui-interactive` | feedback de presión `scale(0.97)` en `:active` |
| `.ui-surface-hover` | hover lift de superficies clicables (borde + translateY + sombra) |
| `.ui-motion-enter` / `.ui-motion-slide-up` | entrada con desplazamiento sutil |
| `.ui-motion-fade` | entrada con fade |
| `.ui-motion-scale` | entrada con escala desde `scale(0.96)` (respeta `--transform-origin`) |
| `.ui-motion-highlight` | resalta **una vez** una fila/KPI recién actualizado |

`Button`, `Input`, `Switch`, filas de `Table`, `ChipFiltro`, `SegmentedControl`,
`KpiCard` (variante enlazada), `PesoInput`/`PesoInputPair` y `EmptyState` (entrada
con `.ui-motion-slide-up`) ya consumen estas utilidades/tokens; no reimplementes
transiciones a mano. Los controles accionables llevan feedback de presión
(`active:scale-[0.97]`). Las barras de progreso y los gráficos (`SeriesChart`,
`StatusDistributionChart`) que animan dimensión usan `transition-[width|height]`
con tokens + `motion-reduce:transition-none` (solo animan al cambiar datos, no en
cada render), nunca `transition-all`.

> **`transition-all` está erradicado** de `src/` (dashboard y público). Para
> superficies con hover-lift, listar propiedades explícitas
> (`transition-[transform,box-shadow,border-color,...]`) con tokens, o usar
> `.ui-surface-hover`. Nunca animes propiedades de layout (`width`/`height`) salvo
> barras finas de progreso/gráficos.

### Animaciones permitidas

Entradas sutiles; fade/scale de diálogos; popovers y menús (origen en el
disparador vía variables de Radix); indicador de tabs; feedback de botones;
expansión de filtros; highlight de fila/KPI actualizado; animación breve de
gráficos.

### Animaciones prohibidas

Rebotes/elastic decorativos; animación constante; animar **cada** fila de tablas
extensas; `layout shift`; números contando desde cero en cada render; elevación
en elementos no interactivos; transiciones lentas (>300ms en UI); ocultar
latencia con movimiento; animar cada refetch; `ease-in` en UI.

### Reducción de movimiento

Todo el sistema respeta `@media (prefers-reduced-motion: reduce)`. Además existe
una **red de seguridad global** al final de `src/index.css` que reduce a casi
cero toda `animation`/`transition` (incluidas las utilidades `animate-in/out` de
`tw-animate-css` que usan los overlays Radix —dropdown, dialog, sheet, select—,
que de otro modo **no** respetan la preferencia). Se usa `0.01ms` (no `0`) para
que `animationend` siga disparándose y Radix desmonte los overlays. Cualquier
animación nueva queda cubierta automáticamente; en JS, usar además
`useReducedMotion`/`matchMedia` cuando la animación sea programática.

### Patrones de interacción

- Acciones de teclado de alta frecuencia: **sin animación**.
- Entrar → `--motion-ease-enter`; mover/morph → `--motion-ease-emphasized`;
  color/hover → `--motion-ease-standard`.
- Solo animar `transform`/`opacity` (y color/borde baratos). Nunca `width`/`height`
  de contenido grande.
- Popovers/menús escalan desde su disparador; los diálogos quedan centrados.

### Ejemplo canónico

```tsx
// Control interactivo: transición + presión por utilidad, sin transition-all
<button className="ui-transition active:scale-[0.97] …">Guardar</button>

// Fila/KPI recién actualizado (una sola vez)
<tr className={recienActualizado ? 'ui-motion-highlight' : undefined}>…</tr>
```

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

### Accesibilidad del shell y navegación

- Tanto `MainLayout` (dashboard) como `PublicPageLayout` exponen un **skip link**
  («Saltar al contenido») que enfoca `#main-content`. Conservarlo al tocar el shell.
- El `<main>` del dashboard tiene `id="main-content"` y `tabIndex={-1}` como destino
  del skip link.
- Navegación: el enlace activo lleva `aria-current="page"`; los grupos colapsables
  del `Sidebar` exponen `aria-expanded`. No depender solo del color para el estado
  activo (hay indicador de barra + peso de fuente).

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

### Bandejas (universos de trabajo) — `BandejaTabs`

Componente canónico: **`@/components/BandejaTabs`**. Consumidores actuales:
`/paquetes` (Operativos · Todos · En revisión) y `/guias-master`
(Operativas · Pendientes · En revisión).

**Qué es una bandeja vs. qué no lo es** (no migrar lo que no sea bandeja):

| Concepto | Definición | Control | Ejemplos |
|---|---|---|---|
| **Bandeja** | Divide el módulo en **universos de trabajo mutuamente excluyentes** (cambia el dataset base, su contador y su contexto). | `BandejaTabs` | Paquetes (operativos/todos/en revisión), Guías (operativas/pendientes/en revisión) |
| **Filtro** | **Reduce** el universo activo; combinable. | `FiltrosBar`/`ChipFiltro`/combobox | sin peso, vencidos, consignatario, estado, envío, guía |
| **Paso** | Etapa de **captura** dentro de un flujo. | stepper / `SegmentedControl` local | `DespachoStepperForm` (oficina/courier) |
| **Modo** | Cambia **cómo** se ejecuta una herramienta local; no cambia el universo. | `SegmentedControl` / tablist local | `DistribucionSacasPanel` (manual/automática), `BulkGuiaInputPanel` (lista/individual), `Pesaje` (distribuir por…), `EnlacesAcceso` (tipo/unidad), `RoleSwitcher` del dashboard |

Regla: **una bandeja nunca es un filtro, paso ni modo**. No conviertas filtros/pasos/modos en `BandejaTabs` ni al revés.

**API**

```tsx
<BandejaTabs
  value={value}
  onValueChange={onValueChange}
  options={[{ value, label, count?, icon?, tone?, hidden?, disabled?, accessibleLabel? }]}
  title={tituloBandejaActiva}
  description={descripcionBandejaActiva}
  help={ayudaSecundaria}
/>
```

- **Contadores**: vienen del **resumen del backend** (p. ej. `PaqueteResumenDTO.bandejas`, `GuiaMasterDashboard.conteosPorEstado`). **Nunca** se descarga el dataset para contar. Son **a nivel universo** (estables; no varían con la búsqueda) y consistentes entre módulos. El badge se oculta si el count es 0.
- **Permisos**: una opción sin permiso usa `hidden` (no se renderiza). Además, el contador de una bandeja restringida se **omite en el backend** a quien no tiene su permiso (p. ej. `PaqueteResumenDTO.bandejas.enRevision = 0` sin `PAQUETES_REVISION_READ`); `todos`/`operativos` se mantienen reales para que el badge coincida con la lista.
- **URL**: la bandeja activa se persiste como `?bandeja=`. El **valor por defecto es la bandeja principal de trabajo** (Operativos / Operativas) y va **sin** parámetro; `todos`/`pendientes`/`en_revision` requieren parámetro explícito. Se lee con `useRouterState` y se escribe con `navigate({ search, replace: true })`.
- **Loading / sin datos obsoletos**: la `bandeja` forma parte de la **queryKey** del listado y del resumen; el `placeholderData` conserva datos **solo dentro de la misma bandeja** (paginación fluida) y **nunca entre bandejas distintas** (esqueleto limpio, sin filas de otra bandeja). Al cambiar de bandeja: resetear página, limpiar selección, cerrar diálogos dependientes y limpiar filtros no aplicables.
- **Empty state**: por bandeja, con copy propio (no genérico).
- **Responsive / a11y**: semántica `tablist`/`tab` + `aria-selected`, navegación por teclado (flechas/Home/End saltando deshabilitadas), foco gestionado, **scroll horizontal local** del contenedor (nunca overflow de página, ni `grid-cols-3` base, ni reducir fuente). Título/descripción/ayuda se renderizan integrados **debajo** de las pestañas.

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

**Accesibilidad de validación**: el error de `LabeledField` se anuncia con
`role="alert"`; el de `FormMessage` (RHF) ya queda enlazado al control vía
`aria-describedby` + `aria-invalid`. Ambos entran con `.ui-motion-fade`
(respeta `prefers-reduced-motion`). No dependas solo del color rojo para señalar
el error: mantén el ícono/su texto.

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

## 5.5 Responsive (estándar canónico)

### Viewports canónicos

Verificar en: **320, 360, 390, 430, 768, 1024, 1280, 1440, 1720 px**, además de
zoom 200%, texto aumentado, orientación horizontal y datos con nombres extensos.
Regla dura: a 320 px **ninguna** página debe producir scroll horizontal
(`document.documentElement.scrollWidth <= clientWidth`).

### Reglas

1. **`min-w-0` en hijos flexibles que deban encoger.** Un hijo flex/grid tiene
   `min-width: auto` por defecto: su contenido (texto `nowrap`, valor de un
   `Select`) fija un ancho mínimo que **propaga overflow hacia arriba**. Añade
   `min-w-0` al hijo (y a contenedores intermedios) para permitir `truncate`/
   `line-clamp`. Causa raíz del fallo histórico en `/parametros-sistema/por-punto`.
2. **Controles a `w-full max-w-full` en móvil**; el ancho limitado se activa desde
   un breakpoint (`sm:w-[220px]`), nunca como ancho base fijo.
3. **`truncate`/`line-clamp` solo funcionan con `min-w-0`** en la cadena flex.
   Define por cada texto largo si **envuelve, trunca o rompe** (`break-words`).
4. **Acciones apiladas en móvil** (`flex-col gap-… sm:flex-row`); ver `PageHeader`,
   `TablePagination`.
5. **Tablas**: envolver en `ListTableShell` (`.table-responsive` con
   `overflow-x:auto`). La **tabla** desplaza su contenedor, **no la página**.
6. **Popovers / dialogs no superan el viewport**: `Select` (`max-w-[calc(100vw-2rem)]`),
   `SearchableCombobox` (`minWidth: min(max(trigger,16rem), calc(100vw-16px))`),
   `Dialog` (`w-[calc(100%-1.5rem)] max-w-lg`). Radix porta el contenido fuera del
   `overflow` del contenedor.
7. **Prohibido** ocultar defectos con `overflow-x-hidden` global en `body`/shell;
   corrige el nodo que desborda. No reducir tipografía globalmente.
8. No depender de hover; targets táctiles ≥ ~32–36 px de alto.

### Controles compartidos ya endurecidos

`SelectTrigger` (`min-w-0 max-w-full`, valor `min-w-0` truncable, icono `shrink-0`),
`SelectContent` (`max-w-[calc(100vw-2rem)]`, scroll vertical, items multilínea),
`SearchableCombobox` (trigger `min-w-0`, valor `min-w-0 flex-1 truncate`, popover
acotado al viewport). Reutilízalos; no reimplementes triggers a mano.

### Pruebas responsive

JSDOM no mide píxeles: en Vitest se prueba **estructura** (clases `min-w-0`/
`max-w-full`, variantes, teclado, apertura/selección). Para regresión visual real
se recomienda Playwright (proyectos 320/390/768/1280) aseverando
`scrollWidth <= clientWidth`; aún no incorporado (requiere autorización de
dependencia). Mientras tanto, checklist manual con DevTools device toolbar.

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
- [ ] Responsive: `min-w-0` en hijos flex que truncan; controles `w-full` en móvil;
      sin scroll horizontal a 320 px (ver §5.5)
