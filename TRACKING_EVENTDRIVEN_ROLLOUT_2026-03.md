# Tracking event-driven: pruebas, flags y rollout

## Feature flags
- `tracking.timeline.use-events`: habilita lectura de timeline desde `paquete_estado_evento`.
- `tracking.outbox.relay-delay-ms`: frecuencia del relay de outbox.
- `tracking.outbox.max-attempts`: máximo de reintentos antes de marcar `FAILED`.

## Plan de pruebas ejecutado
- Backend: `./mvnw.cmd -q test` en `ecubox-backend`.
- Frontend: `npm run -s build` en `ecubox-frontend`.
- Casos nuevos cubiertos:
  - Persistencia dual `paquete_estado_evento` + `outbox_event`.
  - Validación de rango de fechas para aplicación de estado por período.
  - Compatibilidad de tracking sin romper contrato existente.

## Verificaciones operativas recomendadas
- Revisar que existan registros en `paquete_estado_evento` y `outbox_event` al cambiar estados.
- Confirmar avance de `outbox_event.status` de `PENDING` a `SENT`.
- Alertar si hay crecimiento sostenido de eventos `FAILED`.

## Estrategia de despliegue
1. Desplegar backend con migración `V35` y flag `tracking.timeline.use-events=false`.
2. Verificar generación de eventos/outbox en producción sin afectar respuesta de tracking.
3. Activar `tracking.timeline.use-events=true` de forma gradual.
4. Monitorear errores del relay y latencia de actualización en tracking.
