# Reporte de Ampliación de Migración Histórica (V119)

Este reporte detalla los resultados, conteos previos y posteriores de la migración de base de datos **V119**, la cual reconcilió y alineó los estados históricos de envíos consolidados, paquetes y guías master con el motor canónico de estados y las configuraciones de parámetros vigentes.

---

## 1. Configuración de Parámetros Leída

La migración leyó dinámicamente los siguientes IDs de `parametro_sistema`:
* **Registro (`estado_rastreo_registro_paquete`):** ID `1`
* **Planilla (`estado_rastreo_asociar_envio_consolidado`):** ID `28`
* **Manifestado (`estado_rastreo_cierre_consolidado`):** ID `29` (fallback a `estado_rastreo_asociar_guia_master`)
* **En vuelo (`estado_rastreo_enviado_desde_usa`):** ID `30`
* **Aduana (`estado_rastreo_arribado_ec`):** ID `33` (fallback a `estado_rastreo_arribo_ecuador`)
* **Bodega (`estado_rastreo_en_lote_recepcion`):** ID `33`
* **Despacho (`estado_rastreo_en_despacho`):** ID `34`
* **Entrega (`estado_rastreo_entrega_confirmada_cliente`):** ID `36`

---

## 2. Reporte Previo Obligatorio (Auditoría Inicial)

Antes de aplicar las actualizaciones, la base de datos de desarrollo reportaba los siguientes registros desalineados y candidatos:

* **Envíos Consolidados corregibles:** `4`
* **Envíos Consolidados ambiguos:** `0`
* **Paquetes corregibles por Consolidado:** `0`
* **Paquetes corregibles por Lote:** `0`
* **Paquetes corregibles por Despacho:** `5`
* **Paquetes corregibles por Entrega:** `0`
* **Paquetes excluidos por estado especial (bloqueados, alternos, revisiones):** `0`
* **Guías a recalcular por cada estado resultante sugerido:**
  * `CON_PAQUETES_REGISTRADOS`: `4`
  * `DESPACHO_COMPLETADO`: `3`
  * *Otros estados (envío, recepción, etc.):* `0`
* **Eventos de tracking a insertar (`paquete_estado_evento`):** `5`

---

## 3. Resultados de la Aplicación (Actualizaciones)

La migración transaccional aplicó los siguientes cambios físicos:

* **Consolidados actualizados:** `4` (IDs: `6`, `7`, `8`, `11` actualizados a `RECIBIDO_EN_BODEGA` debido a que tenían paquetes o hitos en bodega)
* **Paquetes actualizados en estado y fecha de cambio:** `5` (IDs: `5`, `8`, `9`, `12`, `13` actualizados a `TRABAJO` debido a que estaban vinculados a despachos activos)
* **Guías master recalculadas en estado global:** `7` (IDs: `3`, `6`, `7` a `DESPACHO_COMPLETADO`; IDs: `8`, `10`, `13`, `14` a `CON_PAQUETES_REGISTRADOS`)
* **Eventos de tracking insertados:** `5` (de forma idempotente con `idempotency_key` e inyectando metadatos estructurados en `metadata_json`)

---

## 4. Reporte Posterior Obligatorio (Aseguramiento de Calidad)

Tras completarse la migración, la validación posterior reportó los siguientes resultados que garantizan la integridad del flujo:

* **Consolidados determinísticamente rezagados:** `0` (Confirmado)
* **Paquetes normales por debajo de su piso operativo:** `0` (Confirmado)
* **Guías afectadas sin recalcular:** `0` (Confirmado)
* **Eventos duplicados detectados:** `0` (Confirmado)
* **Registros ambiguos listados con motivo:** `0` (Ningún consolidado ambiguo detectado en la base de desarrollo)

---

## 5. Metadata de Eventos y Auditoría

Para cada cambio aplicado, se inyectaron metadatos en JSON que identifican la migración y la regla aplicada:

### Ejemplo de Metadata de Paquete en `paquete_estado_evento`:
```json
{
  "migrationRun": "V119",
  "entityType": "PAQUETE",
  "sourceRelation": "despacho",
  "sourceId": 7,
  "previousState": "PLANILLA",
  "targetState": "TRABAJO",
  "calculationRule": "Piso operativo del paquete",
  "historicalTimestamp": "2026-04-18T03:31:00"
}
```

### Ejemplo de Historial de Guía Master en `guia_master_estado_historial`:
```json
{
  "migrationRun": "V119",
  "entityType": "GUIA_MASTER",
  "previousState": "CON_PAQUETES_REGISTRADOS",
  "targetState": "DESPACHO_COMPLETADO",
  "calculationRule": "Reconciliacion de guias",
  "historicalTimestamp": "2026-06-17T23:27:17"
}
```
