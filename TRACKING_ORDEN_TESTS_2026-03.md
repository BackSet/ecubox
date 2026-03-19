# Pruebas: orden global de tracking (alternos/mixtos)

## Backend (automatizadas)

- `EstadoRastreoServiceTest.reorderTracking_reordenaEstadosActivos`
  - Verifica reordenamiento masivo y persistencia de `ordenTracking` secuencial.
- `EstadoRastreoServiceTest.reorderTracking_fallaSiHayIdsDuplicados`
  - Verifica validación de IDs duplicados en `PUT /api/operario/estados-rastreo/orden-tracking`.

## Backend (integración funcional)

- `PaqueteService.findByNumeroGuiaForTracking` debe devolver estados ordenados por `ordenTracking`.
- `buildTimelineFromEventos` debe insertar estados en una sola línea y ordenar por `ordenTracking`.

## Frontend operario (manual)

1. Ir a `Parámetros del sistema > Estados de rastreo`.
2. En sección **Orden global para tracking público**, mover `RETENIDO` entre dos estados objetivo.
3. Guardar y validar toast de éxito.
4. Recargar página y confirmar persistencia del orden.
5. Verificar que salir sin guardar dispara diálogo de cambios pendientes.

## Frontend tracking público (manual)

Caso de referencia: `EN_USA -> RETENIDO -> EN_ECUADOR`

1. Reordenar `RETENIDO` en la posición deseada desde operario.
2. Consultar tracking público de un paquete que pasó por esa incidencia.
3. Validar que timeline se muestra en una sola línea principal y respeta `ordenTracking`.
