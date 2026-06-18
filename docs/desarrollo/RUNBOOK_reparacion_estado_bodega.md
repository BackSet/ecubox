# Runbook — Reparación del estado de "llegada a bodega" (paquetes históricos)

> Herramienta de mantenimiento controlado. Corrige paquetes históricos cuyo
> envío consolidado fue **recibido en un lote de recepción** pero que **no
> recibieron el estado configurado de "llegada a bodega"** (inconsistencias
> previas al MVP 2). Reutiliza la clasificación central del MVP 2: **no degrada**
> posteriores/terminales/alternos/bloqueados, usa la **fecha histórica** del lote,
> registra eventos **idempotentes** y **no envía notificaciones**.

## 0. Prerrequisitos (bloqueantes)

No ejecutar en producción hasta confirmar TODOS:

1. **MVP 2 desplegado en producción**: el commit en producción contiene la
   clasificación central `PaqueteService.aplicarEstadoEnConjunto` (corrección
   preventiva). Verificar el SHA desplegado vs. el repositorio. **Si el commit
   desplegado no contiene el MVP 2, DETENERSE.**
2. La herramienta (este MVP 3) está desplegada en el mismo entorno.
3. Backup de la base de datos o mitigación de rollback confirmada.
4. Acceso productivo autorizado y **ventana de mantenimiento aprobada**.
5. Usuario con permiso `ESTADOS_RASTREO_UPDATE` (administrador).

> Estado actual del repositorio al redactar este runbook: **MVP 1 y MVP 2 NO
> están commiteados ni desplegados** (working tree de `dev`). Por tanto, la
> ejecución productiva **no está habilitada** todavía.

## 1. Mecanismo

Endpoint administrativo (no se ejecuta solo; requiere llamada explícita en la
ventana aprobada):

```
POST /api/operario/mantenimiento/reparacion-estado-bodega
Authorization: Bearer <token de admin con ESTADOS_RASTREO_UPDATE>
Content-Type: application/json
```

Body:

```json
{
  "modo": "DRY_RUN",          // DRY_RUN (audita, no escribe) | EXECUTE (aplica)
  "confirmacion": null,        // requerido solo en EXECUTE (ver §3)
  "batchSize": 100,            // opcional, acotado a [1, 500]
  "maxPaquetes": null          // opcional, tope de paquetes por corrida
}
```

Respuesta: `ReparacionBodegaReporteDTO` con `repairRunId`, conteos por categoría
(`reparados`, `yaCorrectos`, `yaReparados`, `posteriores`, `alternos`,
`bloqueados`, `sinFecha`, `destinoNoConfigurado`, `noEncontrados`, `errores`),
`ultimoIdProcesado` (checkpoint), `completo` y una `muestra` con estado anterior,
estado nuevo, fecha histórica y si el evento fue registrado.

## 2. Procedimiento

1. **Dry-run total** (no escribe):
   ```json
   { "modo": "DRY_RUN" }
   ```
   Guardar el reporte. Revisar `reparados` (candidatos reales) y las categorías
   omitidas. Inspeccionar la `muestra` (estado anterior → nuevo, fecha histórica).
2. **Aprobación**: presentar el reporte de dry-run al responsable. Obtener
   aprobación explícita por escrito (no continuar sin ella).
3. **Ejecución por lotes** (controlada). Primera corrida acotada:
   ```json
   { "modo": "EXECUTE", "confirmacion": "EJECUTAR-REPARACION-BODEGA", "batchSize": 100, "maxPaquetes": 200 }
   ```
   Revisar el reporte (afectados/omitidos/errores). Repetir incrementando
   `maxPaquetes` o sin tope hasta `completo: true`.
4. **Verificación**: repetir el **dry-run total**. Criterio de éxito:
   `reparados == 0` (no quedan candidatos actualizables). Los omitidos legítimos
   (posteriores/alternos/bloqueados/sinFecha) pueden persistir y se documentan.
5. **Reporte final**: archivar el último dry-run y los reportes de ejecución
   (con `repairRunId`, timestamps, commit desplegado, conteos previos/posteriores).

## 3. Confirmación

`EXECUTE` exige `confirmacion = "EJECUTAR-REPARACION-BODEGA"` (constante
`ReparacionEstadoBodegaService.CONFIRMACION_REQUERIDA`). Sin ella el endpoint
responde 400 sin escribir. El `DRY_RUN` no requiere confirmación.

## 4. Garantías (verificadas por tests)

- **Dry-run no escribe** (`dryRun` no llama `save` ni registra evento).
- **Idempotencia**: clave de evento estable `reparacion-bodega:<paqueteId>:<estadoBodegaId>`.
  Una segunda corrida deja todo en `yaReparados`/`yaCorrectos` sin cambios.
- **Fecha histórica**: mínima `fecha_recepcion` del lote del consolidado; si no
  hay fecha fiable → `SIN_FECHA` (no se inventa la fecha actual).
- **No degrada**: reutiliza la clasificación central (posteriores/terminales,
  alternos, bloqueados y en revisión se omiten).
- **Sin notificaciones**: el evento de reparación NO crea outbox ni avisos
  (`TrackingEventService.registrarReparacionEstado`).
- **Resiliencia**: cada paquete se repara en su propia transacción; un error
  intermedio cuenta como `errores` y la corrida continúa (reanudable por
  `ultimoIdProcesado`).

## 5. Rollback / mitigación

- Los eventos de reparación son auditables (`event_type = ESTADO_REPARADO_LOTE_RECEPCION`,
  `event_source = REPARACION_LOTE_RECEPCION:<repairRunId>`); permiten identificar
  exactamente qué paquetes se tocaron en cada corrida.
- Ante un problema, restaurar desde el backup confirmado en §0.3. No hay borrado
  de eventos por la herramienta.

## 6. Registro de la corrida productiva (rellenar al ejecutar)

| Campo | Valor |
|---|---|
| Commit desplegado (SHA) | _pendiente_ |
| Configuración productiva (`estadoRastreoEnLoteRecepcionId`) | _pendiente_ |
| Comando dry-run + timestamp | _pendiente_ |
| repairRunId(s) | _pendiente_ |
| Conteo previo (dry-run `reparados`) | _pendiente_ |
| Lotes ejecutados | _pendiente_ |
| Afectados / omitidos / errores | _pendiente_ |
| Verificación final (dry-run `reparados`) | _pendiente_ |
| Notificaciones enviadas | 0 (por diseño) |
