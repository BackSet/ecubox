# Identidad visual ECUBOX

> Sistema visual del rebranding ECUBOX. **MVP 1/5: fundamentos técnicos** (tokens,
> assets, tipografía, favicon/PWA, documentación). No incluye el rediseño de
> pantallas; eso corresponde a MVPs posteriores.
>
> Fuente de implementación: `ecubox-frontend/`. Guía operativa de UI:
> [`ecubox-frontend/UI_GUIDELINES.md`](../../ecubox-frontend/UI_GUIDELINES.md).

## 1. Concepto

- **Símbolo**: monograma **«ec»** enlazado (ligadura e+c que forma un lazo de
  conexión/infinito) — expresa el enlace continuo USA ⇆ Ecuador y la
  trazabilidad de extremo a extremo. Geometría provista por el equipo de marca,
  optimizada en `scripts/brand-glyphs.mjs`.
- **Wordmark**: **ECUBOX** (vectorizado). Logo **monocromo**: símbolo y wordmark
  comparten tinta (carbón sobre claro, gris claro sobre oscuro).
- **Lema**: **«Conecta · Envía · Llega»**.
- **Atributos**: limpio, logístico, confiable, trazable.
- **Violeta** = acento de UI (CTAs, estado activo), **no** se usa en el logo ni
  en el icono de la app.

## 2. Paleta

| Color | Hex | Rol |
| --- | --- | --- |
| Negro carbón | `#0D0D0F` | Texto principal (claro) · lienzo (oscuro) |
| Gris grafito | `#2A2A30` | Superficies/secundarios en modo oscuro |
| Gris claro | `#F2F3F5` | Lienzo de la app (claro) |
| Violeta ECUBOX | `#6C5CE7` | Color de marca primario |
| Violeta suave | `#EDE9FE` | Acento / realces sutiles |

Mapeo a tokens (`ecubox-frontend/src/index.css`, `:root` y `.dark`). **Regla: en
componentes se usan tokens, nunca el hex directo.**

| Token | Claro | Oscuro |
| --- | --- | --- |
| `--background` | `#F2F3F5` | `#0D0D0F` |
| `--foreground` | `#0D0D0F` | `#ECECF0` |
| `--card` / `--popover` | `#FFFFFF` | `#17171C` |
| `--primary` / `--ring` | `#6C5CE7` | `#8B7CF0` |
| `--accent` | `#EDE9FE` | `#2A2A30` |
| `--secondary` / `--muted` | `#E7E8EC` | `#2A2A30` |
| `--border` | `#DEDFE5` | `#2E2E36` |
| `--input` | `#D2D3DB` | `#3A3A42` |

En modo oscuro el primary se aclara a `#8B7CF0` para mantener contraste sobre el
carbón sin perder identidad. Existen además tokens semánticos de marca:
`--color-ecubox-carbon|grafito|gris-claro|violeta|violeta-suave` y los
históricos `--color-ecubox-acento(-claro)` repuntados al violeta.

## 3. Tipografía

- **Sora** (Jonny Pinhorn) — Google Fonts, licencia **SIL Open Font License 1.1**
  (libre para uso comercial y embebido; no es una fuente propietaria).
- Es la `--font-sans` global y la `--font-display`. Pesos cargados: 400/500/600/700.
- **Fallback**: `system-ui, -apple-system, sans-serif`.
- **Carga/performance**: `preconnect` a Google Fonts + `<link rel="preload"
  as="style" onload>` con respaldo `<noscript>` en `index.html`; `display=swap`.
  El CSS crítico inline mantiene el fallback hasta que Sora termina de cargar
  (evita FOUC y bloqueo de render).

## 4. Logo y uso

Componente único: `EcuboxLogo` (`ecubox-frontend/src/components/brand`). No
incrustar SVG a mano.

- `<EcuboxLogo />` — lockup horizontal (símbolo + wordmark); resuelve claro/oscuro.
- `<EcuboxLogo iconOnly />` — solo el símbolo (sidebar colapsado, espacios reducidos).
- `size="sm|md|lg"`, `asLink`, `linkTo`, `variant="onPurple"` (tinta clara sobre
  fondos violeta).

### Lockups disponibles (`src/assets/brand/`)

| Archivo | Uso |
| --- | --- |
| `ecubox-symbol-{light,dark}.svg` | Isotipo bare (símbolo «ec» solo), monocromo |
| `ecubox-logo-horizontal-{light,dark}.svg` | Símbolo + wordmark en línea |
| `ecubox-logo-stacked-{light,dark}.svg` | Símbolo arriba, wordmark abajo |

Convención de sufijos: **`-light`** = pensado para **fondos claros** (tinta
carbón); **`-dark`** = para **fondos oscuros** (tinta gris claro).

El **icono de la app / avatar** es distinto del isotipo bare: es un **badge negro
carbón** (gradiente `#2A2A30→#0D0D0F`) con el símbolo en **blanco**, generado como
favicon e iconos PWA. El isotipo bare se usa en logos y dentro de la UI.

`public/brand-pattern.svg` es un patrón decorativo de lazos de conexión en
violeta tenue para fondos de marca (referenciable por CSS `url('/brand-pattern.svg')`).

### Zona de seguridad y mínimos

- Mantener alrededor del logo un margen ≥ a la mitad de la altura del símbolo.
- Tamaño mínimo legible del lockup horizontal: ~24 px de alto; del símbolo: ~16 px.
- No deformar, recolorear fuera de paleta, rotar ni añadir sombras al logo.

## 5. Favicon, PWA e iconos

- **Fuente única del glifo**: `ecubox-frontend/scripts/brand-glyphs.mjs` (símbolo
  + wordmark + gradientes). Garantiza que pestaña, iconos PWA y UI no se
  desalineen.
- **Generadores** (idempotentes):
  - `scripts/generate-brand-assets.mjs` → lockups en `src/assets/brand/` + `public/brand-pattern.svg`.
  - `scripts/generate-favicons.mjs` → `public/favicon{,-light,-dark}.svg`.
  - `scripts/generate-pwa-icons.mjs` → `public/icons/ecubox-monogram-{192,512,180,maskable-512}.png` (Sharp).
  - Se ejecutan con `npm run icons:generate` y como parte de `npm run build`.
- **Manifest** (`public/manifest.webmanifest`): `theme_color`/`background_color`
  = `#F2F3F5`; iconos `any` + `maskable`.
- **`index.html`**: `theme-color` dinámico (claro `#F2F3F5` / oscuro `#0D0D0F`),
  `mask-icon color="#6C5CE7"`, favicon por tema, cache-bust `?v=8`.
- **Sincronía en runtime**: `src/lib/theme-colors.ts` (`APP_SURFACE_COLORS`,
  `FAVICON_ASSET_VERSION`) actualiza `theme-color`, barra iOS y favicon según el
  tema efectivo. Al cambiar un favicon, incrementar `FAVICON_ASSET_VERSION` **y**
  el `?v=` de `index.html`/manifest a la par.

## 6. Próximos MVPs (rebranding)

- **MVP 2** — Componentes base (botones, inputs, badges, cards) afinados a la
  nueva paleta y a Sora; estados y foco.
- **MVP 3** — Sitio público / landing (hero, secciones, patrón de marca, OG image).
- **MVP 4** — Dashboard interno (sidebar, topbar, tablas, KPIs) con el lenguaje
  visual nuevo.
- **MVP 5** — Documentos exportables (PDF/XLSX), rastreo público y pulido final.

> Las pantallas no se rediseñan en MVP 1; los tokens y assets son la base sobre
> la que esos MVPs construyen sin volver a tocar los fundamentos.
