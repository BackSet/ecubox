-- V114: backfill auditable del evento de "entrada a despacho" para estadísticas.
--
-- Las métricas "Paquetes despachados" y "Peso despachado" se anclan en el
-- event_type semántico ESTADO_APLICADO_DESPACHO (estable), no en el id mutable
-- del estado de despacho. Los despachos creados antes de que el flujo emitiera
-- ese evento no lo tienen y aparecían en cero pese a existir el despacho.
--
-- Esta migración emite, UNA SOLA VEZ por paquete y de forma idempotente, el
-- evento faltante para cada paquete que ya está en una saca despachada, anclado
-- en la FECHA REAL del despacho (despacho.fecha_hora), no en la fecha de
-- ejecución de la migración. Los eventos reconstruidos son identificables por
-- event_source = 'BACKFILL_DESPACHO', idempotency_key 'backfill-despacho-v114:*'
-- y metadata_json {"backfill":true,...}. No modifica V35.
--
-- Si el hito de despacho no está configurado, no se reconstruye nada (la métrica
-- se reportará como SIN_CONFIGURACION en el dashboard).

-- 0) Reemplaza backfills PROVISIONALES previos (dev-seed/manual) que quedaron
--    con event_source genérico e indistinguibles de los reales. En producción
--    estas claves no existen, por lo que es un no-op.
DELETE FROM paquete_estado_evento
WHERE idempotency_key LIKE 'backfill-despacho:%'
   OR idempotency_key LIKE 'dev-seed-despacho-evento:%';

-- 1) Reconstrucción del evento de despacho faltante.
WITH cfg AS (
    SELECT NULLIF((SELECT valor FROM parametro_sistema
                   WHERE clave = 'estado_rastreo_en_despacho'), '')::bigint AS despacho_id
)
INSERT INTO paquete_estado_evento
    (event_id, paquete_id, estado_origen_id, estado_destino_id, event_type, event_source,
     actor_usuario_id, motivo_alterno, idempotency_key, metadata_json, occurred_at, created_at)
SELECT gen_random_uuid(),
       p.id,
       NULL,
       cfg.despacho_id,
       'ESTADO_APLICADO_DESPACHO',
       'BACKFILL_DESPACHO',
       NULL,
       NULL,
       'backfill-despacho-v114:' || p.id,
       '{"backfill":true,"fuente":"despacho.fecha_hora","migracion":"V114"}',
       d.fecha_hora,
       now()
FROM paquete p
JOIN saca s ON s.id = p.saca_id
JOIN despacho d ON d.id = s.despacho_id
CROSS JOIN cfg
WHERE cfg.despacho_id IS NOT NULL
  AND EXISTS (SELECT 1 FROM estado_rastreo er WHERE er.id = cfg.despacho_id)
  AND d.fecha_hora IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM paquete_estado_evento e
      WHERE e.paquete_id = p.id
        AND e.event_type = 'ESTADO_APLICADO_DESPACHO'
  );
