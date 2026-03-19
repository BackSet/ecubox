# Benchmark web y validación UX (ECUBOX)

## Objetivo

Usar referencias actuales para orientar decisiones de rediseño en dashboard logístico, tracking cliente, dark mode accesible e imprimibles jsPDF.

## Fuentes consultadas

- Smashing Magazine: UX para dashboards en tiempo real.
- Eleven Space / AppVerticals: patrones de dashboards logísticos 2025.
- Recursos de tracking post-compra (WISMO reduction, branded tracking).
- Guías de contraste WCAG en dark mode.
- Buenas prácticas de tablas y layouts en jsPDF.

## Hallazgos aplicables a ECUBOX

### 1) Dashboard operario (logística)

- Priorizar decisiones rápidas, no solo datos.
- Jerarquía visual estricta: alertas y pendientes arriba, detalle bajo demanda.
- Reducir carga cognitiva con progressive disclosure.

**Aplicación ECUBOX**
- Resumen superior por módulo (totales, pendientes, errores).
- Acciones secundarias dentro de modal “Más acciones”.
- Mantener visibles solo crear/guardar/procesar.

### 2) Tracking cliente

- Timeline con lenguaje simple y contexto (“última actualización”).
- Mostrar estimaciones como rango cuando aplique.
- Diseño mobile-first con información clave por encima del fold.

**Aplicación ECUBOX**
- Cabecera de estado actual más destacada.
- Microcopy contextual por estado.
- Bloques de “qué significa este estado” para reducir incertidumbre.

### 3) Dark mode accesible

- Cumplir WCAG: texto normal >= 4.5:1; texto grande >= 3:1; componentes UI >= 3:1.
- Dark mode no sustituye accesibilidad: validar ambos temas por igual.

**Aplicación ECUBOX**
- Tokens de color auditables.
- Revisión de contraste de componentes base (botones, inputs, badges, tablas).

### 4) Imprimibles/descargables jsPDF

- Definir una guía documental única (tipografía, espaciado, grillas, footer).
- Evitar layouts ad-hoc por documento.
- Repetir encabezados/footers consistentes y tablas legibles.

**Aplicación ECUBOX**
- Unificar estilo entre `despachoPdf` y `manifiestoPdf`.
- Mantener `runJsPdfAction` con feedback homogéneo.

## Checklist de validación final

- **Usabilidad operario**
  - Menos clics en tareas frecuentes.
  - Acciones críticas visibles, secundarias ocultas en modal/drawer.
- **Usabilidad cliente**
  - Tracking y calculadora claros en móvil y desktop.
  - Error states y empty states comprensibles.
- **Consistencia visual**
  - Mismos patrones de card, tabla, toolbar, formulario.
  - Light/dark consistentes.
- **Accesibilidad**
  - Contraste mínimo WCAG en componentes base.
  - Estados focus visibles en teclado.
- **Imprimibles**
  - Identidad visual consistente.
  - Lectura clara de tablas y totales.

