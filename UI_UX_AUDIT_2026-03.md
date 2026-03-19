# Auditoría UI/UX ECUBOX (Operario + Cliente)

## Resumen ejecutivo

El proyecto tiene una base funcional sólida, pero la experiencia presenta alta variabilidad visual entre módulos y varios flujos operativos con sobrecarga cognitiva. Se recomienda consolidar un sistema de diseño y aplicar un rediseño por lotes para reducir riesgo operativo.

## Hallazgos principales

- **Navegación dashboard densa**: demasiadas entradas visibles al mismo nivel en `Sidebar`, con poca jerarquía por frecuencia de uso.
- **Flujos operarios extensos**: el formulario de despacho concentra demasiada lógica y estados en un solo archivo.
- **Inconsistencia de formularios**: múltiples variantes de inputs/selects construidos inline en distintas páginas.
- **Acciones secundarias mezcladas con críticas**: en listados operativos conviven acciones de alto y bajo uso sin progresive disclosure.
- **Imprimibles con estilo no unificado**: existe disparidad entre builders PDF y vistas de detalle.
- **Riesgo técnico detectado**: llamadas de logging de depuración embebidas en producción dentro de `DespachoStepperForm`.

## Evidencia por archivo

- Rutas y arquitectura plana:
  - `d:\ECUBOX\ecubox-frontend\src\routes\router.tsx`
- Shell de navegación:
  - `d:\ECUBOX\ecubox-frontend\src\app\layout\MainLayout.tsx`
  - `d:\ECUBOX\ecubox-frontend\src\app\layout\Sidebar.tsx`
  - `d:\ECUBOX\ecubox-frontend\src\app\layout\Header.tsx`
- Flujos operarios de alta complejidad:
  - `d:\ECUBOX\ecubox-frontend\src\pages\dashboard\despachos\DespachoStepperForm.tsx`
  - `d:\ECUBOX\ecubox-frontend\src\pages\dashboard\parametros-sistema\ParametrosSistemaPage.tsx`
  - `d:\ECUBOX\ecubox-frontend\src\pages\dashboard\manifiestos\ManifiestoDetailPage.tsx`
- Cliente:
  - `d:\ECUBOX\ecubox-frontend\src\pages\login\LoginPage.tsx`
  - `d:\ECUBOX\ecubox-frontend\src\pages\registro\RegistroCompletoPage.tsx`
  - `d:\ECUBOX\ecubox-frontend\src\pages\tracking\TrackingPage.tsx`
  - `d:\ECUBOX\ecubox-frontend\src\pages\calculadora\CalculadoraPage.tsx`
- Imprimibles:
  - `d:\ECUBOX\ecubox-frontend\src\lib\pdf\builders\despachoPdf.ts`
  - `d:\ECUBOX\ecubox-frontend\src\lib\pdf\builders\manifiestoPdf.ts`
  - `d:\ECUBOX\ecubox-frontend\src\lib\pdf\actions.ts`

## Fricciones priorizadas

1. **Despacho stepper**: demasiadas decisiones en una sola pantalla; faltan capas de “acciones avanzadas”.
2. **Listados operarios**: tablas densas sin resumen ejecutivo visible al inicio.
3. **Parámetros del sistema**: multipropósito dentro de una vista extensa.
4. **Tracking cliente**: buen contenido, pero puede mejorar jerarquía visual y microcopys de estado.
5. **PDFs**: estructura técnica correcta, pero sin guía visual única para consistencia documental.

## Patrones UX globales definidos

- Mostrar primero: estado actual, próximos pasos y acción primaria.
- Mover acciones de baja frecuencia a modal/drawer (“Más acciones”).
- Mantener acciones críticas siempre visibles (crear, guardar, confirmar).
- Formularios largos por secciones con títulos cortos y ayudas contextuales.
- Tablas: resumen superior + filtros + acciones masivas separadas.
- Feedback continuo: toasts y estados de carga uniformes.

## Riesgos y mitigación

- **Riesgo**: romper flujos críticos operarios.
  - **Mitigación**: rediseño incremental por módulo + QA funcional por ruta.
- **Riesgo**: inconsistencia visual post-rediseño.
  - **Mitigación**: tokens globales + componentes base obligatorios.
- **Riesgo**: contraste insuficiente en dark mode.
  - **Mitigación**: validar contraste WCAG en light/dark en cada iteración.

