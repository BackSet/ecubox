# Validación UX/UI post-rediseño (ECUBOX)

## Alcance validado

- Shell dashboard (sidebar, header, toolbar, tarjetas base).
- Módulos operarios: despachos, manifiestos, lotes (listados y acciones).
- Experiencia cliente: home, login, registro completo, tracking, calculadora.
- Imprimibles/descargables: PDF de despacho y PDF de manifiesto.

## Métricas de validación propuestas

| Métrica | Objetivo |
|---|---|
| Tiempo para crear despacho | Reducir al menos 15% |
| Tiempo para encontrar un despacho en lista | Reducir al menos 20% |
| Errores de formulario en login/registro | Reducir al menos 25% |
| Tasa de uso de acciones secundarias | Subir adopción sin aumentar errores |
| Legibilidad dark mode | 0 incidencias críticas de contraste |
| Consistencia visual PDF | 100% documentos con encabezado/tabla/footer uniforme |

## Checklist funcional operario

- [ ] Sidebar y header mantienen navegación y permisos sin regresión.
- [ ] Listados muestran resumen superior y búsqueda funcional.
- [ ] “Más acciones” en despachos agrupa acciones secundarias sin bloquear flujo principal.
- [ ] Crear/editar despacho sigue funcionando sin errores.
- [ ] No existen llamadas de debugging embebidas en flujo productivo.

## Checklist funcional cliente

- [ ] Login mantiene autenticación y errores correctos.
- [ ] Registro completo valida campos y envía payload correcto.
- [ ] Tracking muestra estado actual, leyenda y timeline correctamente.
- [ ] Calculadora convierte lbs/kg y calcula costo estimado correctamente.

## Checklist de diseño y accesibilidad

- [ ] Botones, inputs, cards y toolbars usan patrón visual consistente.
- [ ] Focus visible en controles críticos.
- [ ] Contraste visual suficiente en light y dark.
- [ ] Textos largos no rompen layout en mobile.

## Checklist imprimibles

- [ ] Encabezados de despacho/manifiesto comparten jerarquía visual.
- [ ] Tablas se imprimen legibles con cortes de página correctos.
- [ ] Footer estandarizado con paginación.
- [ ] Acciones “Descargar” e “Imprimir” operan sin errores.

## Referencias

- `d:\ECUBOX\UI_UX_AUDIT_2026-03.md`
- `d:\ECUBOX\UI_UX_BENCHMARK_2026-03.md`

