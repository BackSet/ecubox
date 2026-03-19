# Auditoría técnica de estado de rastreo (event-driven readiness)

## Contexto auditado
- Backend: `ecubox-backend` (estado, transiciones, tracking público, reglas operativas).
- Frontend: `ecubox-frontend` (búsqueda tracking, timeline, manejo de estados).

## Checklist validable
- [x] Reglas de transición centralizadas e identificadas en backend.
- [x] Reglas de bloqueo/incidencia validadas con pruebas unitarias existentes.
- [x] Brechas de consistencia contrato/implementación detectadas.
- [x] Riesgos de idempotencia/duplicidad en cambios masivos identificados.
- [x] Riesgos de UX en tracking público documentados.
- [x] Puntos de extensión para event-driven definidos.

## Hallazgos concretos
1. **Motor de transición actual**
   - La transición operativa se resuelve en `PaqueteService.aplicarEstadoConReglas`.
   - Existe validación de transición permitida (`estado_rastreo_transicion`) y validación de resolución para paquetes bloqueados.

2. **Trazabilidad incompleta**
   - Hoy se persiste el estado actual (`paquete.estado_rastreo_id`) pero no un historial inmutable de eventos por transición.
   - Esto dificulta auditoría temporal, replay y consumo externo confiable.

3. **Brecha de contrato tracking**
   - `TrackingResponse.leyenda` documenta sustitución de `{dias}`, pero la implementación usa `EstadoRastreo.leyenda` sin transformación.

4. **Riesgos de consistencia**
   - Cambios masivos guardan paquete por paquete sin mecanismo idempotente explícito por operación.
   - No hay outbox transaccional para publicar cambios de estado sin riesgo de dual-write.

5. **Frontend tracking**
   - Búsquedas rápidas consecutivas pueden competir entre sí (sin cancelación de request previa).
   - Validación de guía es mínima (entrada vacía solo bloquea submit, sin feedback explícito de formato).

## Criterios de cierre de auditoría
- El proyecto cuenta con inventario de riesgos y brechas para transición event-driven.
- Se definió que la migración debe:
  - mantener lectura rápida por estado actual,
  - agregar historial de eventos inmutable,
  - incorporar outbox transaccional e idempotencia.
