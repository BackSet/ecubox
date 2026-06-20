-- V120: Reconciliación histórica de estados (red de seguridad re-ejecutable).
--
-- Esta migración reconcilia integralmente el histórico de consolidados, paquetes y guías master
-- contra el piso operativo derivado de sus relaciones (consolidado, lote de recepción, despacho,
-- entrega y liquidación) y la configuración vigente de "estados por punto" en parametro_sistema.
--
-- Es una RED DE SEGURIDAD independiente y re-ejecutable: re-deriva sus candidatos en cada corrida,
-- nunca degrada estados avanzados, omite alternos/bloqueados/en revisión/terminales, usa fechas
-- históricas verificables (nunca CURRENT_TIMESTAMP como fecha logística) e inserta eventos de
-- tracking faltantes de forma idempotente (sin emitir notificaciones ni automatismos comerciales).
--
-- Respecto de V118/V119 añade el caso determinístico de la Regla 4 que aquéllas no cubrían:
--   * un consolidado que pertenece a una liquidación pero está por debajo de LIQUIDADO se eleva a LIQUIDADO.
-- En una base donde V118/V119 ya corrieron, el resto de candidatos ya estará alineado y esta
-- migración no modificará filas (idempotente). En una base donde no corrieron, hace la reparación
-- completa por sí sola.
--
-- NOTA sobre la Regla 1 (despacho EN_TRANSITO / ENTREGADO): la entidad `despacho` no tiene estado
-- propio, por lo que "despacho en tránsito/entregado" no es derivable de forma determinística a nivel
-- de despacho. El piso por despacho se fija en `estado_rastreo_en_despacho` (Trabajado/Preparando
-- envío) y sólo se eleva a ENTREGADO cuando el propio paquete tiene un evento de entrega. El parámetro
-- `estado_rastreo_en_transito` se lee y valida por completitud, pero no existe fuente determinística
-- que eleve un paquete a EN_TRANSITO sin su propio evento (que la regla anti-degradación ya conserva).

DO $$
DECLARE
    -- IDs de estado_rastreo (estados por punto)
    v_registro_id BIGINT;
    v_planilla_id BIGINT;
    v_manifestado_id BIGINT;
    v_vuelo_id BIGINT;
    v_aduana_id BIGINT;
    v_bodega_id BIGINT;
    v_despacho_id BIGINT;
    v_transito_id BIGINT;
    v_entrega_id BIGINT;

    -- Órdenes efectivos
    v_registro_orden INT;
    v_planilla_orden INT;
    v_manifestado_orden INT;
    v_vuelo_orden INT;
    v_aduana_orden INT;
    v_bodega_orden INT;
    v_despacho_orden INT;
    v_entrega_orden INT;

    -- Contadores de aplicación
    c_consolidados_actualizados INT := 0;
    c_paquetes_actualizados INT := 0;
    c_eventos_insertados INT := 0;
    c_guias_recalculadas INT := 0;

    -- Contadores post-migración
    c_post_consolidados_rezagados INT := 0;
    c_post_paquetes_desalineados INT := 0;
    c_post_guias_sin_recalcular INT := 0;
    c_post_eventos_duplicados INT := 0;
BEGIN
    -- ====================================================
    -- 1. Leer IDs desde parámetros del sistema (sin hardcodear)
    -- ====================================================
    SELECT NULLIF(valor, '')::BIGINT INTO v_registro_id    FROM parametro_sistema WHERE clave = 'estado_rastreo_registro_paquete';
    SELECT NULLIF(valor, '')::BIGINT INTO v_planilla_id    FROM parametro_sistema WHERE clave = 'estado_rastreo_asociar_envio_consolidado';
    SELECT NULLIF(valor, '')::BIGINT INTO v_manifestado_id FROM parametro_sistema WHERE clave = 'estado_rastreo_cierre_consolidado';
    IF v_manifestado_id IS NULL THEN
        SELECT NULLIF(valor, '')::BIGINT INTO v_manifestado_id FROM parametro_sistema WHERE clave = 'estado_rastreo_asociar_guia_master';
    END IF;
    SELECT NULLIF(valor, '')::BIGINT INTO v_vuelo_id       FROM parametro_sistema WHERE clave = 'estado_rastreo_enviado_desde_usa';
    SELECT NULLIF(valor, '')::BIGINT INTO v_aduana_id      FROM parametro_sistema WHERE clave = 'estado_rastreo_arribado_ec';
    IF v_aduana_id IS NULL THEN
        SELECT NULLIF(valor, '')::BIGINT INTO v_aduana_id FROM parametro_sistema WHERE clave = 'estado_rastreo_arribo_ecuador';
    END IF;
    SELECT NULLIF(valor, '')::BIGINT INTO v_bodega_id      FROM parametro_sistema WHERE clave = 'estado_rastreo_en_lote_recepcion';
    SELECT NULLIF(valor, '')::BIGINT INTO v_despacho_id    FROM parametro_sistema WHERE clave = 'estado_rastreo_en_despacho';
    SELECT NULLIF(valor, '')::BIGINT INTO v_transito_id    FROM parametro_sistema WHERE clave = 'estado_rastreo_en_transito';
    SELECT NULLIF(valor, '')::BIGINT INTO v_entrega_id     FROM parametro_sistema WHERE clave = 'estado_rastreo_entrega_confirmada_cliente';

    -- ====================================================
    -- 2. Abortar si falta una configuración obligatoria
    -- ====================================================
    IF v_registro_id IS NULL OR v_planilla_id IS NULL OR v_manifestado_id IS NULL OR v_vuelo_id IS NULL
       OR v_aduana_id IS NULL OR v_bodega_id IS NULL OR v_despacho_id IS NULL OR v_transito_id IS NULL
       OR v_entrega_id IS NULL THEN
        RAISE EXCEPTION 'V120 abortada: falta configuración en parametro_sistema. Registro:%, Planilla:%, Manifestado:%, Vuelo:%, Aduana:%, Bodega:%, Despacho:%, Transito:%, Entrega:%',
            v_registro_id, v_planilla_id, v_manifestado_id, v_vuelo_id, v_aduana_id, v_bodega_id, v_despacho_id, v_transito_id, v_entrega_id;
    END IF;

    -- Órdenes efectivos (orden con fallback a orden_tracking)
    SELECT COALESCE(orden, orden_tracking) INTO v_registro_orden    FROM estado_rastreo WHERE id = v_registro_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_planilla_orden    FROM estado_rastreo WHERE id = v_planilla_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_manifestado_orden FROM estado_rastreo WHERE id = v_manifestado_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_vuelo_orden       FROM estado_rastreo WHERE id = v_vuelo_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_aduana_orden      FROM estado_rastreo WHERE id = v_aduana_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_bodega_orden      FROM estado_rastreo WHERE id = v_bodega_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_despacho_orden    FROM estado_rastreo WHERE id = v_despacho_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_entrega_orden     FROM estado_rastreo WHERE id = v_entrega_id;

    IF v_registro_orden IS NULL OR v_planilla_orden IS NULL OR v_manifestado_orden IS NULL OR v_vuelo_orden IS NULL
       OR v_aduana_orden IS NULL OR v_bodega_orden IS NULL OR v_despacho_orden IS NULL OR v_entrega_orden IS NULL THEN
        RAISE EXCEPTION 'V120 abortada: un estado_rastreo configurado no tiene orden efectivo definido.';
    END IF;

    -- ====================================================
    -- 3. Tablas de reporte / auditoría / ambiguos (re-ejecutable: se truncan al inicio)
    -- ====================================================
    CREATE TABLE IF NOT EXISTS migracion_reporte_v120 (
        id SERIAL PRIMARY KEY,
        clave VARCHAR(100) NOT NULL UNIQUE,
        valor VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS migracion_auditoria_v120 (
        id SERIAL PRIMARY KEY,
        entidad VARCHAR(50) NOT NULL,
        entidad_id BIGINT NOT NULL,
        estado_anterior VARCHAR(100),
        estado_nuevo VARCHAR(100),
        fecha_usada TIMESTAMP,
        razon VARCHAR(255),
        metadata_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS migracion_ambiguos_v120 (
        id SERIAL PRIMARY KEY,
        entidad VARCHAR(50) NOT NULL,
        entidad_id BIGINT NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        metadata_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    TRUNCATE TABLE migracion_reporte_v120;
    TRUNCATE TABLE migracion_auditoria_v120;
    TRUNCATE TABLE migracion_ambiguos_v120;

    INSERT INTO migracion_reporte_v120 (clave, valor) VALUES
        ('config_registro_id',    v_registro_id::text),
        ('config_planilla_id',    v_planilla_id::text),
        ('config_manifestado_id', v_manifestado_id::text),
        ('config_vuelo_id',       v_vuelo_id::text),
        ('config_aduana_id',      v_aduana_id::text),
        ('config_bodega_id',      v_bodega_id::text),
        ('config_despacho_id',    v_despacho_id::text),
        ('config_transito_id',    v_transito_id::text),
        ('config_entrega_id',     v_entrega_id::text);

    -- ====================================================
    -- FASE A: candidatos de consolidado
    -- ====================================================
    DROP TABLE IF EXISTS temp_consolidado_v120;
    CREATE TEMPORARY TABLE temp_consolidado_v120 (
        consolidado_id BIGINT PRIMARY KEY,
        codigo VARCHAR(100),
        estado_actual VARCHAR(30),
        estado_sugerido VARCHAR(30),
        num_paquetes INT,
        en_liquidacion BOOLEAN,
        confirmado_en_lote BOOLEAN,
        max_paquete_orden INT,
        fecha_usada TIMESTAMP,
        razon VARCHAR(255),
        es_corregible BOOLEAN,
        es_ambiguo BOOLEAN,
        motivo_ambiguo VARCHAR(255)
    ) ON COMMIT DROP;

    INSERT INTO temp_consolidado_v120 (
        consolidado_id, codigo, estado_actual, estado_sugerido, num_paquetes,
        en_liquidacion, confirmado_en_lote, max_paquete_orden, fecha_usada,
        razon, es_corregible, es_ambiguo, motivo_ambiguo
    )
    SELECT
        ec.id,
        ec.codigo,
        ec.estado_operativo::text,
        -- Estado sugerido determinístico desde los HITOS PROPIOS del consolidado
        -- (no se infiere desde el orden de los paquetes: el catálogo de dev colapsa
        --  aduana y bodega en el mismo estado, lo que haría ambigua esa inferencia).
        CASE
            WHEN ec.estado_operativo = 'CANCELADO' THEN 'CANCELADO'
            -- Regla 4: pertenece a liquidación => LIQUIDADO
            WHEN EXISTS (SELECT 1 FROM liquidacion_consolidado_linea lcl WHERE lcl.envio_consolidado_id = ec.id) THEN 'LIQUIDADO'
            WHEN ec.estado_operativo = 'LIQUIDADO' THEN 'LIQUIDADO'
            -- en lote de recepción confirmado => RECIBIDO_EN_BODEGA
            WHEN EXISTS (SELECT 1 FROM lote_recepcion_guia lrg WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))) THEN 'RECIBIDO_EN_BODEGA'
            WHEN ec.fecha_arribo_ecuador IS NOT NULL THEN 'ARRIBADO_ECUADOR'
            WHEN ec.fecha_cerrado IS NOT NULL THEN 'ENVIADO_DESDE_USA'
            WHEN ec.fecha_cierre IS NOT NULL THEN 'CERRADO'
            WHEN (SELECT COUNT(*) FROM paquete p WHERE p.envio_consolidado_id = ec.id) > 0 THEN 'EN_PREPARACION'
            ELSE ec.estado_operativo::text
        END,
        (SELECT COUNT(*) FROM paquete p WHERE p.envio_consolidado_id = ec.id),
        EXISTS (SELECT 1 FROM liquidacion_consolidado_linea lcl WHERE lcl.envio_consolidado_id = ec.id),
        EXISTS (
            SELECT 1 FROM lote_recepcion_guia lrg
            WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
        ),
        COALESCE((
            SELECT MAX(COALESCE(er.orden, er.orden_tracking))
            FROM paquete p JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
            WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
        ), 0),
        NULL::timestamp, '', FALSE, FALSE, NULL::varchar(255)
    FROM envio_consolidado ec;

    -- Ambiguo: cancelado con relaciones activas (no se corrige, sólo se cataloga)
    UPDATE temp_consolidado_v120
    SET es_ambiguo = TRUE, motivo_ambiguo = 'CONSOLIDADO_CANCELADO_CON_RELACIONES_ACTIVAS'
    WHERE estado_actual = 'CANCELADO' AND max_paquete_orden > v_registro_orden;

    -- Ambiguo: liquidado sin línea de liquidación (no degradar; catalogar)
    UPDATE temp_consolidado_v120
    SET es_ambiguo = TRUE, motivo_ambiguo = 'CONSOLIDADO_LIQUIDADO_SIN_EVIDENCIA'
    WHERE estado_actual = 'LIQUIDADO' AND en_liquidacion IS FALSE;

    -- Corregibles deterministas. Sólo se ELEVA por rango operativo (nunca degrada).
    UPDATE temp_consolidado_v120
    SET es_corregible = TRUE,
        razon = CASE
            WHEN en_liquidacion AND estado_sugerido = 'LIQUIDADO' THEN 'CONSOLIDADO_EN_LIQUIDACION_DEBAJO_DE_LIQUIDADO'
            WHEN confirmado_en_lote AND estado_sugerido = 'RECIBIDO_EN_BODEGA' THEN 'CONSOLIDADO_CONFIRMADO_EN_LOTE_SIN_RECIBIDO'
            WHEN estado_actual = 'VACIO' AND estado_sugerido = 'EN_PREPARACION' THEN 'VACIO_CON_PAQUETES'
            ELSE 'CONSOLIDADO_DEBAJO_DE_HITO'
        END
    WHERE es_ambiguo IS FALSE
      AND estado_actual <> 'CANCELADO'   -- nunca tocar un cancelado
      AND COALESCE(array_position(ARRAY['VACIO','EN_PREPARACION','CERRADO','ENVIADO_DESDE_USA','ARRIBADO_ECUADOR','RECIBIDO_EN_BODEGA','LIQUIDADO'], estado_sugerido), 0)
        > COALESCE(array_position(ARRAY['VACIO','EN_PREPARACION','CERRADO','ENVIADO_DESDE_USA','ARRIBADO_ECUADOR','RECIBIDO_EN_BODEGA','LIQUIDADO'], estado_actual), 0);

    -- Fecha histórica verificable por estado sugerido
    UPDATE temp_consolidado_v120 tc
    SET fecha_usada = COALESCE(
        CASE
            WHEN estado_sugerido = 'LIQUIDADO' THEN (
                SELECT MIN(l.fecha_documento)::timestamp
                FROM liquidacion_consolidado_linea lcl
                JOIN liquidacion l ON lcl.liquidacion_id = l.id
                WHERE lcl.envio_consolidado_id = tc.consolidado_id
            )
            WHEN estado_sugerido = 'RECIBIDO_EN_BODEGA' THEN (
                SELECT MIN(lr.fecha_recepcion)
                FROM lote_recepcion_guia lrg
                JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(tc.codigo))
            )
            WHEN estado_sugerido = 'ARRIBADO_ECUADOR' THEN (SELECT ec.fecha_arribo_ecuador FROM envio_consolidado ec WHERE ec.id = tc.consolidado_id)
            WHEN estado_sugerido = 'ENVIADO_DESDE_USA' THEN (SELECT ec.fecha_cerrado      FROM envio_consolidado ec WHERE ec.id = tc.consolidado_id)
            WHEN estado_sugerido = 'CERRADO'           THEN (SELECT ec.fecha_cierre        FROM envio_consolidado ec WHERE ec.id = tc.consolidado_id)
            ELSE NULL
        END,
        (SELECT ec.updated_at FROM envio_consolidado ec WHERE ec.id = tc.consolidado_id),
        NOW()
    )
    WHERE es_corregible IS TRUE;

    -- ====================================================
    -- FASE B: piso operativo de cada paquete
    -- ====================================================
    DROP TABLE IF EXISTS temp_paquete_v120;
    CREATE TEMPORARY TABLE temp_paquete_v120 (
        paquete_id BIGINT PRIMARY KEY,
        numero_guia VARCHAR(100),
        estado_actual_id BIGINT,
        estado_actual_codigo VARCHAR(100),
        orden_actual INT,
        target_state_id BIGINT,
        target_state_codigo VARCHAR(100),
        target_orden INT,
        fecha_usada TIMESTAMP,
        source_relation VARCHAR(50),
        source_id BIGINT,
        es_corregible BOOLEAN,
        es_excluido BOOLEAN,
        excluido_motivo VARCHAR(255)
    ) ON COMMIT DROP;

    INSERT INTO temp_paquete_v120 (
        paquete_id, numero_guia, estado_actual_id, estado_actual_codigo, orden_actual,
        target_state_id, target_state_codigo, target_orden, fecha_usada, source_relation, source_id,
        es_corregible, es_excluido, excluido_motivo
    )
    SELECT p.id, p.numero_guia, p.estado_rastreo_id, er.codigo,
           COALESCE(er.orden, er.orden_tracking),
           NULL, NULL, 0, NULL, NULL, NULL, FALSE, FALSE, NULL
    FROM paquete p JOIN estado_rastreo er ON p.estado_rastreo_id = er.id;

    WITH calculated AS (
        SELECT
            p.id AS paquete_id,
            max_ord.target_orden,
            CASE max_ord.target_orden
                WHEN v_entrega_orden    THEN v_entrega_id
                WHEN v_despacho_orden   THEN v_despacho_id
                WHEN v_bodega_orden     THEN v_bodega_id
                WHEN v_aduana_orden     THEN v_aduana_id
                WHEN v_vuelo_orden      THEN v_vuelo_id
                WHEN v_manifestado_orden THEN v_manifestado_id
                WHEN v_planilla_orden   THEN v_planilla_id
                ELSE v_registro_id
            END AS target_state_id,
            relations.source_relation,
            relations.source_id,
            dates.fecha_usada
        FROM paquete p
        LEFT JOIN envio_consolidado ec ON p.envio_consolidado_id = ec.id
        LEFT JOIN guia_master gm ON p.guia_master_id = gm.id,
        LATERAL (
            SELECT
                v_registro_orden AS o_registro,
                COALESCE(
                    CASE COALESCE((SELECT tc.estado_sugerido FROM temp_consolidado_v120 tc WHERE tc.consolidado_id = ec.id), ec.estado_operativo::text)
                        WHEN 'LIQUIDADO'         THEN v_bodega_orden
                        WHEN 'RECIBIDO_EN_BODEGA' THEN v_bodega_orden
                        WHEN 'ARRIBADO_ECUADOR'  THEN v_aduana_orden
                        WHEN 'ENVIADO_DESDE_USA' THEN v_vuelo_orden
                        WHEN 'CERRADO'           THEN v_manifestado_orden
                        WHEN 'EN_PREPARACION'    THEN v_planilla_orden
                        ELSE NULL
                    END, 0) AS o_consolidado,
                CASE WHEN (
                        (gm.tracking_base IS NOT NULL AND EXISTS (SELECT 1 FROM lote_recepcion_guia lrg WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(gm.tracking_base))))
                     OR (ec.codigo IS NOT NULL AND EXISTS (SELECT 1 FROM lote_recepcion_guia lrg WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))))
                     OR (COALESCE((SELECT tc.estado_sugerido FROM temp_consolidado_v120 tc WHERE tc.consolidado_id = ec.id), ec.estado_operativo::text) IN ('RECIBIDO_EN_BODEGA','LIQUIDADO'))
                    ) THEN v_bodega_orden ELSE 0 END AS o_lote,
                CASE WHEN p.saca_id IS NOT NULL AND EXISTS (SELECT 1 FROM saca s WHERE s.id = p.saca_id AND s.despacho_id IS NOT NULL)
                     THEN v_despacho_orden ELSE 0 END AS o_despacho,
                CASE WHEN p.estado_rastreo_id = v_entrega_id OR EXISTS (SELECT 1 FROM paquete_estado_evento pee WHERE pee.paquete_id = p.id AND pee.estado_destino_id = v_entrega_id)
                     THEN v_entrega_orden ELSE 0 END AS o_entrega
        ) c,
        LATERAL (SELECT GREATEST(c.o_registro, c.o_consolidado, c.o_lote, c.o_despacho, c.o_entrega) AS target_orden) max_ord,
        LATERAL (
            SELECT
                CASE max_ord.target_orden
                    WHEN c.o_entrega THEN 'entrega'
                    WHEN c.o_despacho THEN 'despacho'
                    WHEN c.o_lote THEN 'lote'
                    WHEN c.o_consolidado THEN 'consolidado'
                    ELSE 'registro'
                END AS source_relation,
                CASE max_ord.target_orden
                    WHEN c.o_entrega THEN COALESCE(
                        (SELECT pee.id FROM paquete_estado_evento pee WHERE pee.paquete_id = p.id AND pee.estado_destino_id = v_entrega_id ORDER BY pee.occurred_at ASC LIMIT 1),
                        p.id)
                    WHEN c.o_despacho THEN (SELECT s.despacho_id FROM saca s WHERE s.id = p.saca_id LIMIT 1)
                    WHEN c.o_lote THEN COALESCE(
                        (SELECT lr.id FROM lote_recepcion_guia lrg JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                           WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(gm.tracking_base)) ORDER BY lr.fecha_recepcion ASC LIMIT 1),
                        (SELECT lr.id FROM lote_recepcion_guia lrg JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                           WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo)) ORDER BY lr.fecha_recepcion ASC LIMIT 1),
                        0)
                    WHEN c.o_consolidado THEN ec.id
                    ELSE p.id
                END AS source_id
        ) relations,
        LATERAL (
            SELECT COALESCE(
                CASE max_ord.target_orden
                    WHEN c.o_entrega THEN (SELECT MIN(pee.occurred_at) FROM paquete_estado_evento pee WHERE pee.paquete_id = p.id AND pee.estado_destino_id = v_entrega_id)
                    WHEN c.o_despacho THEN (SELECT MIN(d.fecha_hora) FROM saca s JOIN despacho d ON s.despacho_id = d.id WHERE s.id = p.saca_id)
                    WHEN c.o_lote THEN (SELECT MIN(lr.fecha_recepcion) FROM lote_recepcion_guia lrg JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                                          WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(gm.tracking_base)) OR LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo)))
                    WHEN c.o_consolidado THEN CASE
                            WHEN max_ord.target_orden = v_aduana_orden THEN ec.fecha_arribo_ecuador
                            WHEN max_ord.target_orden = v_vuelo_orden THEN ec.fecha_cerrado
                            WHEN max_ord.target_orden = v_manifestado_orden THEN ec.fecha_cierre
                            WHEN max_ord.target_orden = v_planilla_orden THEN (SELECT MIN(pee.occurred_at) FROM paquete_estado_evento pee WHERE pee.paquete_id = p.id AND pee.event_type = 'ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO')
                            ELSE NULL
                        END
                    ELSE NULL
                END,
                CASE
                    WHEN ec.estado_operativo = 'ARRIBADO_ECUADOR' THEN ec.fecha_arribo_ecuador
                    WHEN ec.estado_operativo = 'ENVIADO_DESDE_USA' THEN ec.fecha_cerrado
                    WHEN ec.estado_operativo = 'CERRADO' THEN ec.fecha_cierre
                    ELSE NULL
                END,
                p.created_at,
                NOW()
            ) AS fecha_usada
        ) dates
    )
    UPDATE temp_paquete_v120 tp
    SET target_state_id = cal.target_state_id,
        target_state_codigo = er.codigo,
        target_orden = cal.target_orden,
        source_relation = cal.source_relation,
        source_id = cal.source_id,
        fecha_usada = cal.fecha_usada
    FROM calculated cal
    JOIN estado_rastreo er ON cal.target_state_id = er.id
    WHERE tp.paquete_id = cal.paquete_id;

    -- Exclusiones (sólo relevantes cuando habría avance)
    UPDATE temp_paquete_v120 tp SET es_excluido = TRUE, excluido_motivo = 'PAQUETE_BLOQUEADO'
    FROM paquete p WHERE tp.paquete_id = p.id AND p.bloqueado IS TRUE AND tp.orden_actual < tp.target_orden;

    UPDATE temp_paquete_v120 tp SET es_excluido = TRUE, excluido_motivo = 'FLUJO_ALTERNO'
    FROM paquete p WHERE tp.paquete_id = p.id
      AND (p.en_flujo_alterno IS TRUE OR tp.estado_actual_codigo LIKE '%RETENIDO%')
      AND tp.orden_actual < tp.target_orden AND tp.es_excluido IS FALSE;

    UPDATE temp_paquete_v120 tp SET es_excluido = TRUE, excluido_motivo = 'REVISION_ADMINISTRATIVA'
    WHERE EXISTS (SELECT 1 FROM revision_paquete rp WHERE rp.paquete_id = tp.paquete_id AND rp.estado = 'EN_REVISION')
      AND tp.orden_actual < tp.target_orden AND tp.es_excluido IS FALSE;

    UPDATE temp_paquete_v120 tp SET es_excluido = TRUE, excluido_motivo = 'ESTADO_TERMINAL'
    WHERE (tp.estado_actual_codigo LIKE '%DEVUELTO%' OR tp.estado_actual_codigo LIKE '%CANCELADO%')
      AND tp.orden_actual < tp.target_orden AND tp.es_excluido IS FALSE;

    -- Corregibles reales: sólo avanzan (nunca degradan)
    UPDATE temp_paquete_v120
    SET es_corregible = TRUE
    WHERE es_excluido IS FALSE AND orden_actual < target_orden;

    -- ====================================================
    -- FASE C: reconciliación de guías (usa el piso de paquetes ya calculado)
    -- ====================================================
    DROP TABLE IF EXISTS temp_guia_v120;
    CREATE TEMPORARY TABLE temp_guia_v120 (
        guia_id BIGINT PRIMARY KEY,
        estado_actual VARCHAR(40),
        estado_sugerido VARCHAR(40),
        total_esperadas INT,
        registradas INT,
        en_recepcion INT,
        en_consolidado INT,
        despachadas INT,
        es_corregible BOOLEAN
    ) ON COMMIT DROP;

    INSERT INTO temp_guia_v120 (
        guia_id, estado_actual, estado_sugerido, total_esperadas,
        registradas, en_recepcion, en_consolidado, despachadas, es_corregible
    )
    SELECT gm.id, gm.estado_global::text, NULL, gm.total_piezas_esperadas,
        COUNT(*),
        SUM(CASE WHEN COALESCE(CASE WHEN tp.es_corregible THEN tp.target_state_id ELSE p.estado_rastreo_id END, 0) = v_bodega_id THEN 1 ELSE 0 END),
        SUM(CASE WHEN p.envio_consolidado_id IS NOT NULL THEN 1 ELSE 0 END),
        SUM(CASE WHEN p.saca_id IS NOT NULL AND EXISTS (SELECT 1 FROM saca s WHERE s.id = p.saca_id AND s.despacho_id IS NOT NULL) THEN 1 ELSE 0 END),
        FALSE
    FROM guia_master gm
    JOIN paquete p ON p.guia_master_id = gm.id
    JOIN temp_paquete_v120 tp ON tp.paquete_id = p.id
    WHERE gm.estado_global NOT IN ('CANCELADA','EN_REVISION','PENDIENTE_VERIFICACION','DESPACHO_COMPLETADO')
    GROUP BY gm.id, gm.estado_global, gm.total_piezas_esperadas;

    UPDATE temp_guia_v120 tg
    SET estado_sugerido = CASE
        WHEN despachadas > 0 THEN
            CASE WHEN total_esperadas IS NOT NULL AND total_esperadas >= 1
                 THEN CASE WHEN registradas >= total_esperadas AND despachadas >= total_esperadas THEN 'DESPACHO_COMPLETADO' ELSE 'DESPACHO_PARCIAL' END
                 ELSE CASE WHEN despachadas >= registradas THEN 'DESPACHO_COMPLETADO' ELSE 'DESPACHO_PARCIAL' END END
        WHEN (CASE WHEN total_esperadas IS NOT NULL AND total_esperadas >= 1
                   THEN (registradas >= total_esperadas AND en_recepcion >= total_esperadas)
                   ELSE (en_recepcion >= registradas) END) THEN 'RECEPCION_COMPLETA'
        WHEN en_recepcion > 0 THEN 'RECEPCION_PARCIAL'
        WHEN en_consolidado > 0 THEN
            CASE WHEN total_esperadas IS NOT NULL AND total_esperadas >= 1
                 THEN CASE WHEN registradas >= total_esperadas AND en_consolidado >= total_esperadas THEN 'ENVIO_COMPLETO' ELSE 'ENVIO_PARCIAL' END
                 ELSE CASE WHEN en_consolidado >= registradas THEN 'ENVIO_COMPLETO' ELSE 'ENVIO_PARCIAL' END END
        ELSE 'CON_PAQUETES_REGISTRADOS'
    END;

    UPDATE temp_guia_v120 SET es_corregible = TRUE WHERE estado_actual <> estado_sugerido;

    -- ====================================================
    -- REPORTE PREVIO OBLIGATORIO
    -- ====================================================
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_consolidados_corregibles', COUNT(*)::text FROM temp_consolidado_v120 WHERE es_corregible IS TRUE;
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_consolidados_en_liquidacion_corregibles', COUNT(*)::text FROM temp_consolidado_v120 WHERE es_corregible IS TRUE AND en_liquidacion IS TRUE;
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_consolidados_ambiguos', COUNT(*)::text FROM temp_consolidado_v120 WHERE es_ambiguo IS TRUE;
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_paquetes_corregibles_consolidado', COUNT(*)::text FROM temp_paquete_v120 WHERE es_corregible IS TRUE AND source_relation = 'consolidado';
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_paquetes_corregibles_lote', COUNT(*)::text FROM temp_paquete_v120 WHERE es_corregible IS TRUE AND source_relation = 'lote';
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_paquetes_corregibles_despacho', COUNT(*)::text FROM temp_paquete_v120 WHERE es_corregible IS TRUE AND source_relation = 'despacho';
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_paquetes_corregibles_entrega', COUNT(*)::text FROM temp_paquete_v120 WHERE es_corregible IS TRUE AND source_relation = 'entrega';
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_paquetes_excluidos_estado_especial', COUNT(*)::text FROM temp_paquete_v120 WHERE es_excluido IS TRUE;
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_guias_corregibles', COUNT(*)::text FROM temp_guia_v120 WHERE es_corregible IS TRUE;
    INSERT INTO migracion_reporte_v120 (clave, valor)
    SELECT 'pre_eventos_insertar', COUNT(*)::text FROM temp_paquete_v120 WHERE es_corregible IS TRUE;

    -- ====================================================
    -- APLICACIÓN
    -- ====================================================
    -- 1) Ambiguos catalogados
    INSERT INTO migracion_ambiguos_v120 (entidad, entidad_id, motivo, metadata_json)
    SELECT 'CONSOLIDADO', consolidado_id, motivo_ambiguo,
        json_build_object('migrationRun','V120','entityType','CONSOLIDADO','previousState',estado_actual,'reason',motivo_ambiguo)::text
    FROM temp_consolidado_v120 WHERE es_ambiguo IS TRUE;

    -- 2) Consolidados corregibles
    UPDATE envio_consolidado ec
    SET estado_operativo = tc.estado_sugerido, updated_at = NOW()
    FROM temp_consolidado_v120 tc
    WHERE tc.consolidado_id = ec.id AND tc.es_corregible IS TRUE;
    GET DIAGNOSTICS c_consolidados_actualizados = ROW_COUNT;

    INSERT INTO migracion_auditoria_v120 (entidad, entidad_id, estado_anterior, estado_nuevo, fecha_usada, razon, metadata_json)
    SELECT 'CONSOLIDADO', consolidado_id, estado_actual, estado_sugerido, fecha_usada, razon,
        json_build_object('migrationRun','V120','entityType','CONSOLIDADO','previousState',estado_actual,'targetState',estado_sugerido,
            'calculationRule',razon,'historicalTimestamp',to_char(fecha_usada,'YYYY-MM-DD"T"HH24:MI:SS'))::text
    FROM temp_consolidado_v120 WHERE es_corregible IS TRUE;

    -- 3) Paquetes corregibles
    UPDATE paquete p
    SET estado_rastreo_id = tp.target_state_id,
        fecha_estado_actual_desde = tp.fecha_usada,
        fecha_limite_retiro = NULL,
        version = version + 1
    FROM temp_paquete_v120 tp
    WHERE tp.paquete_id = p.id AND tp.es_corregible IS TRUE;
    GET DIAGNOSTICS c_paquetes_actualizados = ROW_COUNT;

    INSERT INTO migracion_auditoria_v120 (entidad, entidad_id, estado_anterior, estado_nuevo, fecha_usada, razon, metadata_json)
    SELECT 'PAQUETE', paquete_id, estado_actual_codigo, target_state_codigo, fecha_usada, 'PISO_OPERATIVO_PAQUETE',
        json_build_object('migrationRun','V120','entityType','PAQUETE','sourceRelation',source_relation,'sourceId',source_id,
            'previousState',estado_actual_codigo,'targetState',target_state_codigo,'calculationRule','Piso operativo del paquete',
            'historicalTimestamp',to_char(fecha_usada,'YYYY-MM-DD"T"HH24:MI:SS'))::text
    FROM temp_paquete_v120 WHERE es_corregible IS TRUE;

    -- 4) Eventos de rastreo idempotentes (sin notificaciones)
    INSERT INTO paquete_estado_evento (
        event_id, paquete_id, estado_origen_id, estado_destino_id,
        event_type, event_source, en_flujo_alterno, bloqueado,
        idempotency_key, metadata_json, occurred_at, created_at
    )
    SELECT gen_random_uuid(), tp.paquete_id, tp.estado_actual_id, tp.target_state_id,
        CASE
            WHEN tp.target_state_id = v_planilla_id    THEN 'ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO'
            WHEN tp.target_state_id = v_manifestado_id THEN 'ESTADO_APLICADO_CIERRE_CONSOLIDADO'
            WHEN tp.target_state_id = v_vuelo_id       THEN 'ESTADO_APLICADO_ENVIADO_USA'
            WHEN tp.target_state_id = v_aduana_id      THEN 'ESTADO_APLICADO_ARRIBO_ECUADOR'
            WHEN tp.target_state_id = v_bodega_id      THEN 'ESTADO_REPARADO_LOTE_RECEPCION'
            WHEN tp.target_state_id = v_despacho_id    THEN 'ESTADO_APLICADO_DESPACHO'
            WHEN tp.target_state_id = v_entrega_id     THEN 'ESTADO_CONFIRMADO_CLIENTE'
            ELSE 'ESTADO_CORREGIDO'
        END,
        'MIGRACION_V120', FALSE, FALSE,
        'reconciliacion-historica-v120:' || tp.paquete_id || ':' || tp.target_state_id,
        json_build_object('migrationRun','V120','entityType','PAQUETE','sourceRelation',tp.source_relation,'sourceId',tp.source_id,
            'previousState',tp.estado_actual_codigo,'targetState',tp.target_state_codigo,'calculationRule','Piso operativo del paquete',
            'historicalTimestamp',to_char(tp.fecha_usada,'YYYY-MM-DD"T"HH24:MI:SS'))::text,
        tp.fecha_usada, tp.fecha_usada
    FROM temp_paquete_v120 tp
    WHERE tp.es_corregible IS TRUE
      AND NOT EXISTS (
          SELECT 1 FROM paquete_estado_evento pee
          WHERE pee.idempotency_key = 'reconciliacion-historica-v120:' || tp.paquete_id || ':' || tp.target_state_id
      );
    GET DIAGNOSTICS c_eventos_insertados = ROW_COUNT;

    -- 5) Reconciliar guías (agregador canónico replicado de forma idempotente)
    DECLARE
        r RECORD;
        v_fecha_recepcion TIMESTAMP;
        v_fecha_despacho TIMESTAMP;
        v_fecha_cierre TIMESTAMP;
        v_cv_id BIGINT;
    BEGIN
        FOR r IN (
            SELECT tg.guia_id, tg.estado_actual, tg.estado_sugerido, tg.en_recepcion, tg.despachadas,
                   gm.consignatario_id, gm.consignatario_version_id, gm.fecha_primera_recepcion, gm.fecha_primera_pieza_despachada
            FROM temp_guia_v120 tg JOIN guia_master gm ON tg.guia_id = gm.id
            WHERE tg.es_corregible IS TRUE
        ) LOOP
            IF r.en_recepcion > 0 AND r.fecha_primera_recepcion IS NULL THEN
                SELECT MIN(fecha_estado_actual_desde) INTO v_fecha_recepcion
                FROM paquete WHERE guia_master_id = r.guia_id AND estado_rastreo_id = v_bodega_id;
                UPDATE guia_master SET fecha_primera_recepcion = COALESCE(v_fecha_recepcion, NOW()) WHERE id = r.guia_id;
            END IF;

            IF r.despachadas > 0 AND r.fecha_primera_pieza_despachada IS NULL THEN
                SELECT MIN(d.fecha_hora) INTO v_fecha_despacho
                FROM saca s JOIN despacho d ON s.despacho_id = d.id
                WHERE s.id IN (SELECT saca_id FROM paquete WHERE guia_master_id = r.guia_id);
                UPDATE guia_master SET fecha_primera_pieza_despachada = COALESCE(v_fecha_despacho, NOW()) WHERE id = r.guia_id;
            END IF;

            IF r.despachadas > 0 AND r.consignatario_version_id IS NULL AND r.consignatario_id IS NOT NULL THEN
                SELECT cv.id INTO v_cv_id FROM consignatario_version cv
                WHERE cv.consignatario_id = r.consignatario_id AND cv.valid_to IS NULL LIMIT 1;
                IF v_cv_id IS NOT NULL THEN
                    UPDATE guia_master SET consignatario_version_id = v_cv_id, consignatario_congelado_en = NOW() WHERE id = r.guia_id;
                END IF;
            END IF;

            IF r.estado_sugerido = 'DESPACHO_COMPLETADO' THEN
                SELECT MAX(d.fecha_hora) INTO v_fecha_cierre
                FROM saca s JOIN despacho d ON s.despacho_id = d.id
                WHERE s.id IN (SELECT saca_id FROM paquete WHERE guia_master_id = r.guia_id);
                UPDATE guia_master
                SET estado_global = r.estado_sugerido::varchar(30),
                    cerrada_en = COALESCE(v_fecha_cierre, NOW()),
                    tipo_cierre = 'DESPACHO_COMPLETADO',
                    motivo_cierre = 'Todas las piezas fueron despachadas',
                    version = version + 1
                WHERE id = r.guia_id;
            ELSE
                UPDATE guia_master SET estado_global = r.estado_sugerido::varchar(30), version = version + 1 WHERE id = r.guia_id;
            END IF;

            INSERT INTO guia_master_estado_historial (guia_master_id, estado_anterior, estado_nuevo, tipo_cambio, motivo, cambiado_en)
            VALUES (r.guia_id, r.estado_actual, r.estado_sugerido, 'RECALCULO_AUTOMATICO',
                json_build_object('migrationRun','V120','entityType','GUIA_MASTER','previousState',r.estado_actual,'targetState',r.estado_sugerido,
                    'calculationRule','Reconciliacion de guias','historicalTimestamp',to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))::text,
                NOW());

            INSERT INTO migracion_auditoria_v120 (entidad, entidad_id, estado_anterior, estado_nuevo, fecha_usada, razon, metadata_json)
            VALUES ('GUIA_MASTER', r.guia_id, r.estado_actual, r.estado_sugerido, NOW(), 'RECONCILIACION_GUIA',
                json_build_object('migrationRun','V120','entityType','GUIA_MASTER','previousState',r.estado_actual,'targetState',r.estado_sugerido,
                    'calculationRule','Reconciliacion de guias','historicalTimestamp',to_char(NOW(),'YYYY-MM-DD"T"HH24:MI:SS'))::text);

            c_guias_recalculadas := c_guias_recalculadas + 1;
        END LOOP;
    END;

    -- ====================================================
    -- VALIDACIÓN POST-MIGRACIÓN
    -- ====================================================
    -- Consolidados aún rezagados (excluyendo ambiguos y cancelados)
    SELECT COUNT(*) INTO c_post_consolidados_rezagados
    FROM (
        SELECT ec.id,
            CASE
                WHEN ec.estado_operativo = 'CANCELADO' THEN 'CANCELADO'
                WHEN EXISTS (SELECT 1 FROM liquidacion_consolidado_linea lcl WHERE lcl.envio_consolidado_id = ec.id) THEN 'LIQUIDADO'
                WHEN ec.estado_operativo = 'LIQUIDADO' THEN 'LIQUIDADO'
                WHEN EXISTS (SELECT 1 FROM lote_recepcion_guia lrg WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))) THEN 'RECIBIDO_EN_BODEGA'
                WHEN ec.fecha_arribo_ecuador IS NOT NULL THEN 'ARRIBADO_ECUADOR'
                WHEN ec.fecha_cerrado IS NOT NULL THEN 'ENVIADO_DESDE_USA'
                WHEN ec.fecha_cierre IS NOT NULL THEN 'CERRADO'
                WHEN (SELECT COUNT(*) FROM paquete p WHERE p.envio_consolidado_id=ec.id) > 0 THEN 'EN_PREPARACION'
                ELSE ec.estado_operativo::text
            END AS sugerido,
            ec.estado_operativo::text AS actual
        FROM envio_consolidado ec
    ) s
    WHERE s.actual <> 'CANCELADO'
      AND COALESCE(array_position(ARRAY['VACIO','EN_PREPARACION','CERRADO','ENVIADO_DESDE_USA','ARRIBADO_ECUADOR','RECIBIDO_EN_BODEGA','LIQUIDADO'], s.sugerido), 0)
        > COALESCE(array_position(ARRAY['VACIO','EN_PREPARACION','CERRADO','ENVIADO_DESDE_USA','ARRIBADO_ECUADOR','RECIBIDO_EN_BODEGA','LIQUIDADO'], s.actual), 0)
      AND NOT EXISTS (SELECT 1 FROM migracion_ambiguos_v120 ma WHERE ma.entidad='CONSOLIDADO' AND ma.entidad_id=s.id);

    -- Paquetes normales aún por debajo de su piso
    SELECT COUNT(*) INTO c_post_paquetes_desalineados
    FROM (
        SELECT p.id, COALESCE(er.orden, er.orden_tracking) AS orden_actual,
            GREATEST(
                v_registro_orden,
                COALESCE(CASE
                    WHEN ec.estado_operativo IN ('RECIBIDO_EN_BODEGA','LIQUIDADO') THEN v_bodega_orden
                    WHEN ec.estado_operativo = 'ARRIBADO_ECUADOR' THEN v_aduana_orden
                    WHEN ec.estado_operativo = 'ENVIADO_DESDE_USA' THEN v_vuelo_orden
                    WHEN ec.estado_operativo = 'CERRADO' THEN v_manifestado_orden
                    WHEN ec.estado_operativo = 'EN_PREPARACION' THEN v_planilla_orden
                    ELSE NULL END, 0),
                CASE WHEN (
                        (gm.tracking_base IS NOT NULL AND EXISTS (SELECT 1 FROM lote_recepcion_guia lrg WHERE LOWER(TRIM(lrg.numero_guia_envio))=LOWER(TRIM(gm.tracking_base))))
                     OR (ec.codigo IS NOT NULL AND EXISTS (SELECT 1 FROM lote_recepcion_guia lrg WHERE LOWER(TRIM(lrg.numero_guia_envio))=LOWER(TRIM(ec.codigo))))
                     OR (ec.estado_operativo IN ('RECIBIDO_EN_BODEGA','LIQUIDADO'))
                    ) THEN v_bodega_orden ELSE 0 END,
                CASE WHEN p.saca_id IS NOT NULL AND EXISTS (SELECT 1 FROM saca s WHERE s.id=p.saca_id AND s.despacho_id IS NOT NULL) THEN v_despacho_orden ELSE 0 END,
                CASE WHEN p.estado_rastreo_id = v_entrega_id OR EXISTS (SELECT 1 FROM paquete_estado_evento pee WHERE pee.paquete_id=p.id AND pee.estado_destino_id=v_entrega_id) THEN v_entrega_orden ELSE 0 END
            ) AS target_orden
        FROM paquete p
        JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
        LEFT JOIN envio_consolidado ec ON p.envio_consolidado_id = ec.id
        LEFT JOIN guia_master gm ON p.guia_master_id = gm.id
        WHERE p.bloqueado IS NOT TRUE AND p.en_flujo_alterno IS NOT TRUE AND er.tipo_flujo = 'NORMAL'
          AND NOT EXISTS (SELECT 1 FROM revision_paquete rp WHERE rp.paquete_id=p.id AND rp.estado='EN_REVISION')
          AND er.codigo NOT LIKE '%RETENIDO%' AND er.codigo NOT LIKE '%DEVUELTO%' AND er.codigo NOT LIKE '%CANCELADO%'
    ) s
    WHERE s.orden_actual < s.target_orden;

    -- Guías aún sin recalcular
    SELECT COUNT(*) INTO c_post_guias_sin_recalcular
    FROM (
        SELECT gm.id, gm.estado_global::text AS actual,
            CASE
                WHEN SUM(CASE WHEN p.saca_id IS NOT NULL AND EXISTS (SELECT 1 FROM saca s WHERE s.id=p.saca_id AND s.despacho_id IS NOT NULL) THEN 1 ELSE 0 END) > 0 THEN
                    CASE WHEN gm.total_piezas_esperadas IS NOT NULL AND gm.total_piezas_esperadas >= 1
                         THEN CASE WHEN COUNT(*) >= gm.total_piezas_esperadas AND SUM(CASE WHEN p.saca_id IS NOT NULL AND EXISTS (SELECT 1 FROM saca s WHERE s.id=p.saca_id AND s.despacho_id IS NOT NULL) THEN 1 ELSE 0 END) >= gm.total_piezas_esperadas THEN 'DESPACHO_COMPLETADO' ELSE 'DESPACHO_PARCIAL' END
                         ELSE CASE WHEN SUM(CASE WHEN p.saca_id IS NOT NULL AND EXISTS (SELECT 1 FROM saca s WHERE s.id=p.saca_id AND s.despacho_id IS NOT NULL) THEN 1 ELSE 0 END) >= COUNT(*) THEN 'DESPACHO_COMPLETADO' ELSE 'DESPACHO_PARCIAL' END END
                WHEN (CASE WHEN gm.total_piezas_esperadas IS NOT NULL AND gm.total_piezas_esperadas >= 1
                           THEN (COUNT(*) >= gm.total_piezas_esperadas AND SUM(CASE WHEN p.estado_rastreo_id=v_bodega_id THEN 1 ELSE 0 END) >= gm.total_piezas_esperadas)
                           ELSE (SUM(CASE WHEN p.estado_rastreo_id=v_bodega_id THEN 1 ELSE 0 END) >= COUNT(*)) END) THEN 'RECEPCION_COMPLETA'
                WHEN SUM(CASE WHEN p.estado_rastreo_id=v_bodega_id THEN 1 ELSE 0 END) > 0 THEN 'RECEPCION_PARCIAL'
                WHEN SUM(CASE WHEN p.envio_consolidado_id IS NOT NULL THEN 1 ELSE 0 END) > 0 THEN
                    CASE WHEN gm.total_piezas_esperadas IS NOT NULL AND gm.total_piezas_esperadas >= 1
                         THEN CASE WHEN COUNT(*) >= gm.total_piezas_esperadas AND SUM(CASE WHEN p.envio_consolidado_id IS NOT NULL THEN 1 ELSE 0 END) >= gm.total_piezas_esperadas THEN 'ENVIO_COMPLETO' ELSE 'ENVIO_PARCIAL' END
                         ELSE CASE WHEN SUM(CASE WHEN p.envio_consolidado_id IS NOT NULL THEN 1 ELSE 0 END) >= COUNT(*) THEN 'ENVIO_COMPLETO' ELSE 'ENVIO_PARCIAL' END END
                ELSE 'CON_PAQUETES_REGISTRADOS'
            END AS sugerido
        FROM guia_master gm JOIN paquete p ON p.guia_master_id = gm.id
        WHERE gm.estado_global NOT IN ('CANCELADA','EN_REVISION','PENDIENTE_VERIFICACION','DESPACHO_COMPLETADO')
        GROUP BY gm.id, gm.estado_global, gm.total_piezas_esperadas
    ) s
    WHERE s.actual <> s.sugerido;

    -- Eventos duplicados por idempotency_key
    SELECT (COUNT(idempotency_key) - COUNT(DISTINCT idempotency_key)) INTO c_post_eventos_duplicados FROM paquete_estado_evento;

    INSERT INTO migracion_reporte_v120 (clave, valor) VALUES
        ('actualizacion_consolidados', c_consolidados_actualizados::text),
        ('actualizacion_paquetes', c_paquetes_actualizados::text),
        ('actualizacion_guias', c_guias_recalculadas::text),
        ('actualizacion_eventos', c_eventos_insertados::text),
        ('post_consolidados_rezagados', c_post_consolidados_rezagados::text),
        ('post_paquetes_desalineados', c_post_paquetes_desalineados::text),
        ('post_guias_afectadas_sin_recalcular', c_post_guias_sin_recalcular::text),
        ('post_eventos_duplicados', c_post_eventos_duplicados::text);

    -- Aseguramiento de calidad: los residuales deben ser 0. No se aborta la migración
    -- (alinea con el precedente V119: registrar y advertir), pero un duplicado de evento
    -- sí es defecto de idempotencia y se trata como error duro.
    IF c_post_eventos_duplicados > 0 THEN
        RAISE EXCEPTION 'V120: defecto de idempotencia, % eventos con idempotency_key duplicada.', c_post_eventos_duplicados;
    END IF;
    IF c_post_paquetes_desalineados > 0 OR c_post_consolidados_rezagados > 0 OR c_post_guias_sin_recalcular > 0 THEN
        RAISE WARNING 'V120: residuales tras reconciliación (consolidados:%, paquetes:%, guias:%). Revisar migracion_ambiguos_v120 / migracion_auditoria_v120.',
            c_post_consolidados_rezagados, c_post_paquetes_desalineados, c_post_guias_sin_recalcular;
    END IF;

    RAISE NOTICE 'V120 OK -> consolidados:% paquetes:% guias:% eventos:%',
        c_consolidados_actualizados, c_paquetes_actualizados, c_guias_recalculadas, c_eventos_insertados;
END $$;
