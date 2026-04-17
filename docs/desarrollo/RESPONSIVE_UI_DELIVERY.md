# Entrega incremental responsive UI

## Bloque 1: Layout + tokens globales
- Nuevas utilidades globales en `ecubox-frontend/src/index.css`:
  - `content-container`, `content-container-wide`
  - `section-spacing`, `mobile-safe-inline`
  - `responsive-title`, `responsive-subtitle`, `responsive-grid-2`
  - `table-responsive`, `table-mobile-cards` (cards en movil + tabla desde `md`)
- Ajuste del contenedor principal en `ecubox-frontend/src/app/layout/MainLayout.tsx`.
- Ajustes de densidad responsive en:
  - `ecubox-frontend/src/components/ListToolbar.tsx`
  - `ecubox-frontend/src/components/ListTableShell.tsx`
  - `ecubox-frontend/src/components/ui/dialog.tsx`

## Bloque 2: UI publica
- Rutas publicas adaptadas:
  - `ecubox-frontend/src/pages/home/HomePage.tsx`
  - `ecubox-frontend/src/pages/login/LoginPage.tsx`
  - `ecubox-frontend/src/pages/registro/RegistroSimplePage.tsx`
  - `ecubox-frontend/src/pages/tracking/TrackingPage.tsx`
  - `ecubox-frontend/src/pages/calculadora/CalculadoraPage.tsx`
- Componentes compartidos adaptados:
  - `ecubox-frontend/src/components/SiteHeader.tsx`
  - `ecubox-frontend/src/components/SiteFooter.tsx`
  - `ecubox-frontend/src/components/Hero.tsx`
  - `ecubox-frontend/src/components/ServicesGrid.tsx`
  - `ecubox-frontend/src/components/FAQ.tsx`

## Bloque 3: Dashboard listados
- Patron responsive unificado aplicado en listados representativos:
  - `ecubox-frontend/src/pages/dashboard/paquetes/PaqueteListPage.tsx`
  - `ecubox-frontend/src/pages/dashboard/destinatarios/DestinatarioListPage.tsx`
  - `ecubox-frontend/src/pages/dashboard/despachos/DespachoListPage.tsx`
- Cambios clave:
  - acciones apiladas en movil y alineadas en desktop;
  - tablas con clase `table-mobile-cards`;
  - `data-label` por celda para vista tipo card en movil.

## Bloque 4: Dashboard formularios complejos
- `ecubox-frontend/src/pages/dashboard/despachos/DespachoStepperForm.tsx`:
  - header y stepper con densidad responsive;
  - cards y grids con padding/gaps escalables;
  - tabla interna de paquetes adaptada a `table-mobile-cards`;
  - barra de acciones sticky en movil para navegacion de pasos.

## Bloque 5: QA tecnico
- Validacion de compilacion: `npm run build` (ok).
- Validacion de diagnosticos IDE en archivos modificados: sin lints nuevos.

## Checklist manual recomendado por breakpoint
- 360/390: sin overflow horizontal, CTA visibles, acciones de tabla operables.
- 768: densidad de cards/tabla equilibrada, navegacion clara.
- 1024: toolbar y acciones en una sola linea cuando aplica.
- 1280+: max-width y jerarquia visual estable, sin espacios muertos excesivos.
