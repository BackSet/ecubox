-- V119: Ampliación de la migración histórica de consolidados, paquetes y guías master.
--
-- Esta migración amplía el histórico reconciliando integralmente consolidados, paquetes y guías,
-- resolviendo hitos cronológicos, alineando estados con el piso operativo de paquetes y
-- recalculando el estado global de las guías afectadas.
-- También registra eventos de tracking con metadatos extendidos sin emitir notificaciones
-- y cataloga registros ambiguos para auditoría administrativa.

DO $$
DECLARE
    -- IDs de estado_rastreo
    v_registro_id BIGINT;
    v_planilla_id BIGINT;
    v_manifestado_id BIGINT;
    v_vuelo_id BIGINT;
    v_aduana_id BIGINT;
    v_bodega_id BIGINT;
    v_despacho_id BIGINT;
    v_entrega_id BIGINT;
    
    -- Ordenes efectivos
    v_registro_orden INT;
    v_planilla_orden INT;
    v_manifestado_orden INT;
    v_vuelo_orden INT;
    v_aduana_orden INT;
    v_bodega_orden INT;
    v_despacho_orden INT;
    v_entrega_orden INT;

    -- Contadores
    c_consolidados_corregibles INT := 0;
    c_consolidados_ambiguos INT := 0;
    
    c_paquetes_corregibles_consolidado INT := 0;
    c_paquetes_corregibles_lote INT := 0;
    c_paquetes_corregibles_despacho INT := 0;
    c_paquetes_corregibles_entrega INT := 0;
    c_paquetes_excluidos_especial INT := 0;
    
    c_guias_recalcular_sin_paquetes INT := 0;
    c_guias_recalcular_con_paquetes INT := 0;
    c_guias_recalcular_envio_parcial INT := 0;
    c_guias_recalcular_envio_completo INT := 0;
    c_guias_recalcular_recepcion_parcial INT := 0;
    c_guias_recalcular_recepcion_completa INT := 0;
    c_guias_recalcular_despacho_parcial INT := 0;
    c_guias_recalcular_despacho_completo INT := 0;
    
    c_eventos_insertar INT := 0;

    -- Contadores post-migración
    c_post_consolidados_rezagados INT := 0;
    c_post_paquetes_desalineados INT := 0;
    c_post_guias_sin_recalcular INT := 0;
    c_post_eventos_duplicados INT := 0;

    c_consolidados_actualizados INT := 0;
    c_paquetes_actualizados INT := 0;
    c_eventos_insertados INT := 0;
    c_guias_recalculadas INT := 0;
BEGIN
    -- 1. Leer IDs desde parametros del sistema
    SELECT NULLIF(valor, '')::BIGINT INTO v_registro_id FROM parametro_sistema WHERE clave = 'estado_rastreo_registro_paquete';
    SELECT NULLIF(valor, '')::BIGINT INTO v_planilla_id FROM parametro_sistema WHERE clave = 'estado_rastreo_asociar_envio_consolidado';
    SELECT NULLIF(valor, '')::BIGINT INTO v_manifestado_id FROM parametro_sistema WHERE clave = 'estado_rastreo_cierre_consolidado';
    IF v_manifestado_id IS NULL THEN
        SELECT NULLIF(valor, '')::BIGINT INTO v_manifestado_id FROM parametro_sistema WHERE clave = 'estado_rastreo_asociar_guia_master';
    END IF;
    SELECT NULLIF(valor, '')::BIGINT INTO v_vuelo_id FROM parametro_sistema WHERE clave = 'estado_rastreo_enviado_desde_usa';
    SELECT NULLIF(valor, '')::BIGINT INTO v_aduana_id FROM parametro_sistema WHERE clave = 'estado_rastreo_arribado_ec';
    IF v_aduana_id IS NULL THEN
        SELECT NULLIF(valor, '')::BIGINT INTO v_aduana_id FROM parametro_sistema WHERE clave = 'estado_rastreo_arribo_ecuador';
    END IF;
    SELECT NULLIF(valor, '')::BIGINT INTO v_bodega_id FROM parametro_sistema WHERE clave = 'estado_rastreo_en_lote_recepcion';
    SELECT NULLIF(valor, '')::BIGINT INTO v_despacho_id FROM parametro_sistema WHERE clave = 'estado_rastreo_en_despacho';
    SELECT NULLIF(valor, '')::BIGINT INTO v_entrega_id FROM parametro_sistema WHERE clave = 'estado_rastreo_entrega_confirmada_cliente';

    -- 2. Abortar si falta una configuración requerida
    IF v_registro_id IS NULL OR v_planilla_id IS NULL OR v_manifestado_id IS NULL OR v_vuelo_id IS NULL OR v_aduana_id IS NULL OR v_bodega_id IS NULL OR v_despacho_id IS NULL OR v_entrega_id IS NULL THEN
        RAISE EXCEPTION 'Falta una configuracion requerida en parametro_sistema. Registro: %, Planilla: %, Manifestado: %, Vuelo: %, Aduana: %, Bodega: %, Despacho: %, Entrega: %',
            v_registro_id, v_planilla_id, v_manifestado_id, v_vuelo_id, v_aduana_id, v_bodega_id, v_despacho_id, v_entrega_id;
    END IF;

    -- Obtener ordenes efectivos
    SELECT COALESCE(orden, orden_tracking) INTO v_registro_orden FROM estado_rastreo WHERE id = v_registro_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_planilla_orden FROM estado_rastreo WHERE id = v_planilla_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_manifestado_orden FROM estado_rastreo WHERE id = v_manifestado_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_vuelo_orden FROM estado_rastreo WHERE id = v_vuelo_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_aduana_orden FROM estado_rastreo WHERE id = v_aduana_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_bodega_orden FROM estado_rastreo WHERE id = v_bodega_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_despacho_orden FROM estado_rastreo WHERE id = v_despacho_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_entrega_orden FROM estado_rastreo WHERE id = v_entrega_id;

    -- Crear tablas de reporte, auditoría y ambiguos si no existen
    CREATE TABLE IF NOT EXISTS migracion_reporte_v119 (
        id SERIAL PRIMARY KEY,
        clave VARCHAR(100) NOT NULL UNIQUE,
        valor VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS migracion_auditoria_v119 (
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

    CREATE TABLE IF NOT EXISTS migracion_ambiguos_v119 (
        id SERIAL PRIMARY KEY,
        entidad VARCHAR(50) NOT NULL,
        entidad_id BIGINT NOT NULL,
        motivo VARCHAR(255) NOT NULL,
        metadata_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Limpiar reportes previos en caso de re-run
    TRUNCATE TABLE migracion_reporte_v119;
    TRUNCATE TABLE migracion_auditoria_v119;
    TRUNCATE TABLE migracion_ambiguos_v119;

    -- Guardar configuraciones en el reporte
    INSERT INTO migracion_reporte_v119 (clave, valor) VALUES
        ('config_registro_id', v_registro_id::text),
        ('config_planilla_id', v_planilla_id::text),
        ('config_manifestado_id', v_manifestado_id::text),
        ('config_vuelo_id', v_vuelo_id::text),
        ('config_aduana_id', v_aduana_id::text),
        ('config_bodega_id', v_bodega_id::text),
        ('config_despacho_id', v_despacho_id::text),
        ('config_entrega_id', v_entrega_id::text);

    -- ----------------------------------------------------
    -- FASE A: Crear temporales para auditoría de consolidado
    -- ----------------------------------------------------
    CREATE TEMPORARY TABLE temp_consolidado_candidatos (
        consolidado_id BIGINT PRIMARY KEY,
        codigo VARCHAR(100),
        estado_actual VARCHAR(30),
        estado_sugerido VARCHAR(30),
        num_paquetes INT,
        confirmado_en_lote BOOLEAN,
        max_paquete_orden INT,
        fecha_usada TIMESTAMP,
        razon VARCHAR(255),
        es_corregible BOOLEAN,
        es_ambiguo BOOLEAN,
        motivo_ambiguo VARCHAR(255)
    ) ON COMMIT DROP;

    INSERT INTO temp_consolidado_candidatos (
        consolidado_id, codigo, estado_actual, estado_sugerido, num_paquetes,
        confirmado_en_lote, max_paquete_orden, fecha_usada, razon, es_corregible, es_ambiguo, motivo_ambiguo
    )
    SELECT
        ec.id,
        ec.codigo,
        ec.estado_operativo::text,
        -- Sugerido (calculado preliminarmente)
        CASE
            WHEN ec.estado_operativo IN ('CANCELADO', 'LIQUIDADO') THEN ec.estado_operativo::text
            WHEN EXISTS (
                SELECT 1 FROM lote_recepcion_guia lrg 
                WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
            ) OR COALESCE((
                SELECT MAX(COALESCE(er.orden, er.orden_tracking))
                FROM paquete p
                JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
                WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
            ), 0) >= v_bodega_orden THEN 'RECIBIDO_EN_BODEGA'
            WHEN ec.fecha_arribo_ecuador IS NOT NULL OR COALESCE((
                SELECT MAX(COALESCE(er.orden, er.orden_tracking))
                FROM paquete p
                JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
                WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
            ), 0) >= v_aduana_orden THEN 'ARRIBADO_ECUADOR'
            WHEN ec.fecha_cerrado IS NOT NULL OR COALESCE((
                SELECT MAX(COALESCE(er.orden, er.orden_tracking))
                FROM paquete p
                JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
                WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
            ), 0) >= v_vuelo_orden THEN 'ENVIADO_DESDE_USA'
            WHEN ec.fecha_cierre IS NOT NULL OR COALESCE((
                SELECT MAX(COALESCE(er.orden, er.orden_tracking))
                FROM paquete p
                JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
                WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
            ), 0) >= v_manifestado_orden THEN 'CERRADO'
            WHEN (SELECT COUNT(*) FROM paquete p WHERE p.envio_consolidado_id = ec.id) > 0 THEN 'EN_PREPARACION'
            WHEN (SELECT COUNT(*) FROM paquete p WHERE p.envio_consolidado_id = ec.id) = 0 AND ec.estado_operativo = 'EN_PREPARACION' THEN 'VACIO'
            ELSE ec.estado_operativo::text
        END AS estado_sugerido,
        (SELECT COUNT(*) FROM paquete p WHERE p.envio_consolidado_id = ec.id) AS num_paquetes,
        EXISTS (
            SELECT 1 FROM lote_recepcion_guia lrg 
            WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
        ) AS confirmado_en_lote,
        COALESCE((
            SELECT MAX(COALESCE(er.orden, er.orden_tracking))
            FROM paquete p
            JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
            WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
        ), 0) AS max_paquete_orden,
        NOW() AS fecha_usada,
        '' AS razon,
        FALSE AS es_corregible,
        FALSE AS es_ambiguo,
        NULL::varchar(255) AS motivo_ambiguo
    FROM envio_consolidado ec;

    -- Identificar ambiguos: cancelado con relaciones activas
    UPDATE temp_consolidado_candidatos
    SET es_ambiguo = TRUE,
        motivo_ambiguo = 'CONSOLIDADO_CANCELADO_CON_RELACIONES_ACTIVAS'
    WHERE estado_actual = 'CANCELADO'
      AND max_paquete_orden > v_registro_orden;

    -- Identificar ambiguos: liquidado sin evidencia
    UPDATE temp_consolidado_candidatos
    SET es_ambiguo = TRUE,
        motivo_ambiguo = 'CONSOLIDADO_LIQUIDADO_SIN_EVIDENCIA'
    WHERE estado_actual = 'LIQUIDADO'
      AND NOT EXISTS (
          SELECT 1 FROM liquidacion_consolidado_linea lcl
          WHERE lcl.envio_consolidado_id = consolidado_id
      );

    -- Determinar corregibles
    UPDATE temp_consolidado_candidatos
    SET es_corregible = TRUE,
        razon = CASE
            WHEN estado_actual = 'VACIO' AND estado_sugerido = 'EN_PREPARACION' THEN 'VACIO_CON_PAQUETES'
            WHEN estado_actual = 'EN_PREPARACION' AND estado_sugerido = 'VACIO' THEN 'EN_PREPARACION_SIN_PAQUETES'
            WHEN confirmado_en_lote AND estado_actual <> 'RECIBIDO_EN_BODEGA' THEN 'CONSOLIDADO_CONFIRMADO_EN_LOTE_SIN_RECIBIDO'
            ELSE 'ESTADO_ANTERIOR_PESE_A_HITO_POSTERIOR'
        END
    WHERE es_ambiguo IS FALSE
      AND estado_actual <> estado_sugerido;

    -- Actualizar fecha_usada para corregibles
    UPDATE temp_consolidado_candidatos tc
    SET fecha_usada = COALESCE(
        CASE
            WHEN estado_sugerido = 'RECIBIDO_EN_BODEGA' THEN (
                SELECT MIN(lr.fecha_recepcion)
                FROM lote_recepcion_guia lrg
                JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(tc.codigo))
            )
            WHEN estado_sugerido = 'ARRIBADO_ECUADOR' THEN (
                SELECT ec.fecha_arribo_ecuador FROM envio_consolidado ec WHERE ec.id = tc.consolidado_id
            )
            WHEN estado_sugerido = 'ENVIADO_DESDE_USA' THEN (
                SELECT ec.fecha_cerrado FROM envio_consolidado ec WHERE ec.id = tc.consolidado_id
            )
            WHEN estado_sugerido = 'CERRADO' THEN (
                SELECT ec.fecha_cierre FROM envio_consolidado ec WHERE ec.id = tc.consolidado_id
            )
            ELSE NULL
        END,
        (SELECT ec.updated_at FROM envio_consolidado ec WHERE ec.id = tc.consolidado_id),
        NOW()
    )
    WHERE es_corregible IS TRUE;


    -- ----------------------------------------------------
    -- FASE B: Crear temporales para piso operativo del paquete
    -- ----------------------------------------------------
    CREATE TEMPORARY TABLE temp_paquete_candidatos (
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

    -- Poblar tabla inicial de paquetes
    INSERT INTO temp_paquete_candidatos (
        paquete_id, numero_guia, estado_actual_id, estado_actual_codigo, orden_actual,
        target_state_id, target_state_codigo, target_orden, fecha_usada, source_relation, source_id,
        es_corregible, es_excluido, excluido_motivo
    )
    SELECT
        p.id,
        p.numero_guia,
        p.estado_rastreo_id,
        er_origen.codigo,
        COALESCE(er_origen.orden, er_origen.orden_tracking) AS orden_actual,
        NULL, NULL, 0, NOW(), NULL, NULL, FALSE, FALSE, NULL
    FROM paquete p
    JOIN estado_rastreo er_origen ON p.estado_rastreo_id = er_origen.id;

    -- Calcular los targets y relaciones para cada paquete
    WITH calculated_targets AS (
        SELECT
            p.id AS paquete_id,
            CASE target_orden
                WHEN v_entrega_orden THEN v_entrega_id
                WHEN v_despacho_orden THEN v_despacho_id
                WHEN v_bodega_orden THEN v_bodega_id
                WHEN v_aduana_orden THEN v_aduana_id
                WHEN v_vuelo_orden THEN v_vuelo_id
                WHEN v_manifestado_orden THEN v_manifestado_id
                WHEN v_planilla_orden THEN v_planilla_id
                ELSE v_registro_id
            END AS target_state_id,
            target_orden,
            source_relation,
            source_id,
            fecha_usada
        FROM paquete p
        LEFT JOIN envio_consolidado ec ON p.envio_consolidado_id = ec.id
        LEFT JOIN guia_master gm ON p.guia_master_id = gm.id,
        LATERAL (
            SELECT
                v_registro_orden AS o_registro,
                
                COALESCE(
                    CASE 
                        WHEN COALESCE((SELECT tc.estado_sugerido FROM temp_consolidado_candidatos tc WHERE tc.consolidado_id = ec.id), ec.estado_operativo::text) IN ('RECIBIDO_EN_BODEGA', 'LIQUIDADO') THEN v_bodega_orden
                        WHEN COALESCE((SELECT tc.estado_sugerido FROM temp_consolidado_candidatos tc WHERE tc.consolidado_id = ec.id), ec.estado_operativo::text) = 'ARRIBADO_ECUADOR' THEN v_aduana_orden
                        WHEN COALESCE((SELECT tc.estado_sugerido FROM temp_consolidado_candidatos tc WHERE tc.consolidado_id = ec.id), ec.estado_operativo::text) = 'ENVIADO_DESDE_USA' THEN v_vuelo_orden
                        WHEN COALESCE((SELECT tc.estado_sugerido FROM temp_consolidado_candidatos tc WHERE tc.consolidado_id = ec.id), ec.estado_operativo::text) = 'CERRADO' THEN v_manifestado_orden
                        WHEN COALESCE((SELECT tc.estado_sugerido FROM temp_consolidado_candidatos tc WHERE tc.consolidado_id = ec.id), ec.estado_operativo::text) = 'EN_PREPARACION' THEN v_planilla_orden
                        ELSE NULL
                    END,
                    0
                ) AS o_consolidado,
                
                CASE 
                    WHEN (
                        (gm.tracking_base IS NOT NULL AND EXISTS (
                            SELECT 1 FROM lote_recepcion_guia lrg 
                            WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(gm.tracking_base))
                        )) OR (ec.codigo IS NOT NULL AND EXISTS (
                            SELECT 1 FROM lote_recepcion_guia lrg 
                            WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                        )) OR (COALESCE((SELECT tc.estado_sugerido FROM temp_consolidado_candidatos tc WHERE tc.consolidado_id = ec.id), ec.estado_operativo::text) IN ('RECIBIDO_EN_BODEGA', 'LIQUIDADO'))
                    ) THEN v_bodega_orden
                    ELSE 0
                END AS o_lote,
                
                CASE 
                    WHEN p.saca_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM saca s WHERE s.id = p.saca_id AND s.despacho_id IS NOT NULL
                    ) THEN v_despacho_orden
                    ELSE 0
                END AS o_despacho,
                
                CASE 
                    WHEN p.estado_rastreo_id = v_entrega_id OR EXISTS (
                        SELECT 1 FROM paquete_estado_evento pee 
                        WHERE pee.paquete_id = p.id AND pee.estado_destino_id = v_entrega_id
                    ) THEN v_entrega_orden
                    ELSE 0
                END AS o_entrega
        ) candidates,
        LATERAL (
            SELECT GREATEST(o_registro, o_consolidado, o_lote, o_despacho, o_entrega) AS target_orden
        ) max_ord,
        LATERAL (
            SELECT
                CASE target_orden
                    WHEN o_entrega THEN 'entrega'
                    WHEN o_despacho THEN 'despacho'
                    WHEN o_lote THEN 'lote'
                    WHEN o_consolidado THEN 'consolidado'
                    ELSE 'registro'
                END AS source_relation,
                
                CASE target_orden
                    WHEN o_entrega THEN (
                        SELECT COALESCE(
                            (SELECT pee.id FROM paquete_estado_evento pee WHERE pee.paquete_id = p.id AND pee.estado_destino_id = v_entrega_id ORDER BY pee.occurred_at ASC LIMIT 1),
                            p.id
                        )
                    )
                    WHEN o_despacho THEN (
                        SELECT s.despacho_id FROM saca s WHERE s.id = p.saca_id LIMIT 1
                    )
                    WHEN o_lote THEN (
                        SELECT COALESCE(
                            (
                                SELECT lr.id
                                FROM lote_recepcion_guia lrg
                                JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                                WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(gm.tracking_base))
                                ORDER BY lr.fecha_recepcion ASC LIMIT 1
                            ),
                            (
                                SELECT lr.id
                                FROM lote_recepcion_guia lrg
                                JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                                WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                                ORDER BY lr.fecha_recepcion ASC LIMIT 1
                            ),
                            0
                        )
                    )
                    WHEN o_consolidado THEN ec.id
                    ELSE p.id
                END AS source_id
        ) relations,
        LATERAL (
            SELECT COALESCE(
                CASE target_orden
                    WHEN o_entrega THEN (
                        SELECT MIN(pee.occurred_at) FROM paquete_estado_evento pee
                        WHERE pee.paquete_id = p.id AND pee.estado_destino_id = v_entrega_id
                    )
                    WHEN o_despacho THEN (
                        SELECT MIN(d.fecha_hora) FROM saca s
                        JOIN despacho d ON s.despacho_id = d.id
                        WHERE s.id = p.saca_id
                    )
                    WHEN o_lote THEN (
                        SELECT MIN(lr.fecha_recepcion)
                        FROM lote_recepcion_guia lrg
                        JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                        WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(gm.tracking_base))
                           OR LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                    )
                    WHEN o_consolidado THEN (
                        CASE 
                            WHEN target_orden = v_aduana_orden THEN ec.fecha_arribo_ecuador
                            WHEN target_orden = v_vuelo_orden THEN ec.fecha_cerrado
                            WHEN target_orden = v_manifestado_orden THEN ec.fecha_cierre
                            WHEN target_orden = v_planilla_orden THEN (
                                SELECT MIN(pee.occurred_at) FROM paquete_estado_evento pee
                                WHERE pee.paquete_id = p.id AND pee.event_type = 'ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO'
                            )
                            ELSE NULL
                        END
                    )
                    ELSE NULL
                END,
                -- fallback a fechas del consolidado
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
    UPDATE temp_paquete_candidatos tc
    SET target_state_id = ct.target_state_id,
        target_state_codigo = er.codigo,
        target_orden = ct.target_orden,
        source_relation = ct.source_relation,
        source_id = ct.source_id,
        fecha_usada = ct.fecha_usada
    FROM calculated_targets ct
    JOIN estado_rastreo er ON ct.target_state_id = er.id
    WHERE tc.paquete_id = ct.paquete_id;

    -- Aplicar exclusiones
    -- Bloqueado
    UPDATE temp_paquete_candidatos tc
    SET es_excluido = TRUE,
        excluido_motivo = 'PAQUETE_BLOQUEADO'
    FROM paquete p
    WHERE tc.paquete_id = p.id
      AND p.bloqueado IS TRUE
      AND tc.orden_actual < tc.target_orden;

    -- Alterno/Retenido
    UPDATE temp_paquete_candidatos tc
    SET es_excluido = TRUE,
        excluido_motivo = 'FLUJO_ALTERNO'
    FROM paquete p
    WHERE tc.paquete_id = p.id
      AND (p.en_flujo_alterno IS TRUE OR tc.estado_actual_codigo = 'RETENIDO_ADUANA' OR tc.estado_actual_codigo LIKE '%RETENIDO%')
      AND tc.orden_actual < tc.target_orden;

    -- Revision
    UPDATE temp_paquete_candidatos tc
    SET es_excluido = TRUE,
        excluido_motivo = 'REVISION_ADMINISTRATIVA'
    WHERE EXISTS (
        SELECT 1 FROM revision_paquete rp
        WHERE rp.paquete_id = tc.paquete_id AND rp.estado = 'EN_REVISION'
    )
    AND tc.orden_actual < tc.target_orden;

    -- Terminal (Devuelto/Cancelado)
    UPDATE temp_paquete_candidatos tc
    SET es_excluido = TRUE,
        excluido_motivo = 'ESTADO_TERMINAL'
    WHERE (tc.estado_actual_codigo LIKE '%DEVUELTO%' OR tc.estado_actual_codigo LIKE '%CANCELADO%')
      AND tc.orden_actual < tc.target_orden;

    -- Marcar corregibles reales
    UPDATE temp_paquete_candidatos
    SET es_corregible = TRUE
    WHERE es_excluido IS FALSE
      AND orden_actual < target_orden;


    -- ----------------------------------------------------
    -- FASE C: Crear temporales para reconciliación de guías
    -- ----------------------------------------------------
    CREATE TEMPORARY TABLE temp_guia_candidatos (
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

    INSERT INTO temp_guia_candidatos (
        guia_id, estado_actual, estado_sugerido, total_esperadas,
        registradas, en_recepcion, en_consolidado, despachadas, es_corregible
    )
    SELECT
        gm.id,
        gm.estado_global::text,
        NULL,
        gm.total_piezas_esperadas,
        COUNT(*),
        SUM(CASE WHEN COALESCE(CASE WHEN tp.es_corregible THEN tp.target_state_id ELSE p.estado_rastreo_id END, 0) = v_bodega_id THEN 1 ELSE 0 END),
        SUM(CASE WHEN p.envio_consolidado_id IS NOT NULL THEN 1 ELSE 0 END),
        SUM(CASE WHEN p.saca_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM saca s WHERE s.id = p.saca_id AND s.despacho_id IS NOT NULL
        ) THEN 1 ELSE 0 END) AS despachadas,
        FALSE
    FROM guia_master gm
    JOIN paquete p ON p.guia_master_id = gm.id
    JOIN temp_paquete_candidatos tp ON tp.paquete_id = p.id
    WHERE gm.estado_global NOT IN ('CANCELADA', 'EN_REVISION', 'PENDIENTE_VERIFICACION', 'DESPACHO_COMPLETADO')
    GROUP BY gm.id, gm.estado_global, gm.total_piezas_esperadas;

    -- Calcular estado_sugerido de guías
    UPDATE temp_guia_candidatos tc
    SET estado_sugerido = CASE
        WHEN despachadas > 0 THEN
            CASE 
                WHEN total_esperadas IS NOT NULL AND total_esperadas >= 1 THEN
                    CASE WHEN registradas >= total_esperadas AND despachadas >= total_esperadas THEN 'DESPACHO_COMPLETADO' ELSE 'DESPACHO_PARCIAL' END
                ELSE
                    CASE WHEN despachadas >= registradas THEN 'DESPACHO_COMPLETADO' ELSE 'DESPACHO_PARCIAL' END
            END
        WHEN (
            CASE 
                WHEN total_esperadas IS NOT NULL AND total_esperadas >= 1 THEN
                    CASE WHEN registradas >= total_esperadas AND en_recepcion >= total_esperadas THEN TRUE ELSE FALSE END
                ELSE
                    CASE WHEN en_recepcion >= registradas THEN TRUE ELSE FALSE END
            END
        ) THEN 'RECEPCION_COMPLETA'
        WHEN en_recepcion > 0 THEN 'RECEPCION_PARCIAL'
        WHEN en_consolidado > 0 THEN
            CASE 
                WHEN total_esperadas IS NOT NULL AND total_esperadas >= 1 THEN
                    CASE WHEN registradas >= total_esperadas AND en_consolidado >= total_esperadas THEN 'ENVIO_COMPLETO' ELSE 'ENVIO_PARCIAL' END
                ELSE
                    CASE WHEN en_consolidado >= registradas THEN 'ENVIO_COMPLETO' ELSE 'ENVIO_PARCIAL' END
            END
        ELSE 'CON_PAQUETES_REGISTRADOS'
    END;

    -- Marcar corregibles
    UPDATE temp_guia_candidatos
    SET es_corregible = TRUE
    WHERE estado_actual <> estado_sugerido;


    -- ----------------------------------------------------
    -- FASE PREVIA: Poblar reporte previo obligatorio
    -- ----------------------------------------------------
    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_consolidados_corregibles', COUNT(*)::text FROM temp_consolidado_candidatos WHERE es_corregible IS TRUE;
    
    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_consolidados_ambiguos', COUNT(*)::text FROM temp_consolidado_candidatos WHERE es_ambiguo IS TRUE;

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_paquetes_corregibles_consolidado', COUNT(*)::text FROM temp_paquete_candidatos WHERE es_corregible IS TRUE AND source_relation = 'consolidado';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_paquetes_corregibles_lote', COUNT(*)::text FROM temp_paquete_candidatos WHERE es_corregible IS TRUE AND source_relation = 'lote';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_paquetes_corregibles_despacho', COUNT(*)::text FROM temp_paquete_candidatos WHERE es_corregible IS TRUE AND source_relation = 'despacho';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_paquetes_corregibles_entrega', COUNT(*)::text FROM temp_paquete_candidatos WHERE es_corregible IS TRUE AND source_relation = 'entrega';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_paquetes_excluidos_estado_especial', COUNT(*)::text FROM temp_paquete_candidatos WHERE es_excluido IS TRUE;

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_guias_recalcular_SIN_PAQUETES_REGISTRADOS', COUNT(*)::text FROM temp_guia_candidatos WHERE es_corregible IS TRUE AND estado_sugerido = 'SIN_PAQUETES_REGISTRADOS';
    
    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_guias_recalcular_CON_PAQUETES_REGISTRADOS', COUNT(*)::text FROM temp_guia_candidatos WHERE es_corregible IS TRUE AND estado_sugerido = 'CON_PAQUETES_REGISTRADOS';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_guias_recalcular_ENVIO_PARCIAL', COUNT(*)::text FROM temp_guia_candidatos WHERE es_corregible IS TRUE AND estado_sugerido = 'ENVIO_PARCIAL';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_guias_recalcular_ENVIO_COMPLETO', COUNT(*)::text FROM temp_guia_candidatos WHERE es_corregible IS TRUE AND estado_sugerido = 'ENVIO_COMPLETO';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_guias_recalcular_RECEPCION_PARCIAL', COUNT(*)::text FROM temp_guia_candidatos WHERE es_corregible IS TRUE AND estado_sugerido = 'RECEPCION_PARCIAL';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_guias_recalcular_RECEPCION_COMPLETA', COUNT(*)::text FROM temp_guia_candidatos WHERE es_corregible IS TRUE AND estado_sugerido = 'RECEPCION_COMPLETA';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_guias_recalcular_DESPACHO_PARCIAL', COUNT(*)::text FROM temp_guia_candidatos WHERE es_corregible IS TRUE AND estado_sugerido = 'DESPACHO_PARCIAL';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_guias_recalcular_DESPACHO_COMPLETADO', COUNT(*)::text FROM temp_guia_candidatos WHERE es_corregible IS TRUE AND estado_sugerido = 'DESPACHO_COMPLETADO';

    INSERT INTO migracion_reporte_v119 (clave, valor)
    SELECT 'pre_eventos_insertar', COUNT(*)::text FROM temp_paquete_candidatos WHERE es_corregible IS TRUE;


    -- ----------------------------------------------------
    -- ACTUALIZACIONES Y REGISTROS DE AUDITORÍA
    -- ----------------------------------------------------
    -- 1. Insertar consolidados ambiguos
    INSERT INTO migracion_ambiguos_v119 (entidad, entidad_id, motivo, metadata_json)
    SELECT
        'CONSOLIDADO',
        consolidado_id,
        motivo_ambiguo,
        json_build_object(
            'migrationRun', 'V119',
            'entityType', 'CONSOLIDADO',
            'previousState', estado_actual,
            'reason', motivo_ambiguo
        )::text
    FROM temp_consolidado_candidatos
    WHERE es_ambiguo IS TRUE;

    -- 2. Actualizar consolidados corregibles
    UPDATE envio_consolidado ec
    SET estado_operativo = tc.estado_sugerido,
        updated_at = NOW()
    FROM temp_consolidado_candidatos tc
    WHERE tc.consolidado_id = ec.id
      AND tc.es_corregible IS TRUE;

    GET DIAGNOSTICS c_consolidados_actualizados = ROW_COUNT;

    INSERT INTO migracion_auditoria_v119 (entidad, entidad_id, estado_anterior, estado_nuevo, fecha_usada, razon, metadata_json)
    SELECT
        'CONSOLIDADO',
        consolidado_id,
        estado_actual,
        estado_sugerido,
        fecha_usada,
        razon,
        json_build_object(
            'migrationRun', 'V119',
            'entityType', 'CONSOLIDADO',
            'previousState', estado_actual,
            'targetState', estado_sugerido,
            'calculationRule', razon,
            'historicalTimestamp', to_char(fecha_usada, 'YYYY-MM-DD"T"HH24:MI:SS')
        )::text
    FROM temp_consolidado_candidatos
    WHERE es_corregible IS TRUE;

    -- 3. Actualizar paquetes corregibles
    UPDATE paquete p
    SET estado_rastreo_id = tp.target_state_id,
        fecha_estado_actual_desde = tp.fecha_usada,
        fecha_limite_retiro = NULL,
        version = version + 1
    FROM temp_paquete_candidatos tp
    WHERE tp.paquete_id = p.id
      AND tp.es_corregible IS TRUE;

    GET DIAGNOSTICS c_paquetes_actualizados = ROW_COUNT;

    INSERT INTO migracion_auditoria_v119 (entidad, entidad_id, estado_anterior, estado_nuevo, fecha_usada, razon, metadata_json)
    SELECT
        'PAQUETE',
        paquete_id,
        estado_actual_codigo,
        target_state_codigo,
        fecha_usada,
        'PISO_OPERATIVO_PAQUETE',
        json_build_object(
            'migrationRun', 'V119',
            'entityType', 'PAQUETE',
            'sourceRelation', source_relation,
            'sourceId', source_id,
            'previousState', estado_actual_codigo,
            'targetState', target_state_codigo,
            'calculationRule', 'Piso operativo del paquete',
            'historicalTimestamp', to_char(fecha_usada, 'YYYY-MM-DD"T"HH24:MI:SS')
        )::text
    FROM temp_paquete_candidatos
    WHERE es_corregible IS TRUE;

    -- 4. Insertar eventos de rastreo idempotentes
    INSERT INTO paquete_estado_evento (
        event_id, paquete_id, estado_origen_id, estado_destino_id,
        event_type, event_source, en_flujo_alterno, bloqueado,
        idempotency_key, metadata_json, occurred_at, created_at
    )
    SELECT
        gen_random_uuid(),
        tp.paquete_id,
        tp.estado_actual_id,
        tp.target_state_id,
        CASE
            WHEN tp.target_state_id = v_planilla_id THEN 'ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO'
            WHEN tp.target_state_id = v_manifestado_id THEN 'ESTADO_APLICADO_CIERRE_CONSOLIDADO'
            WHEN tp.target_state_id = v_vuelo_id THEN 'ESTADO_APLICADO_ENVIADO_USA'
            WHEN tp.target_state_id = v_aduana_id THEN 'ESTADO_APLICADO_ARRIBO_ECUADOR'
            WHEN tp.target_state_id = v_bodega_id THEN 'ESTADO_REPARADO_LOTE_RECEPCION'
            WHEN tp.target_state_id = v_despacho_id THEN 'ESTADO_APLICADO_DESPACHO'
            WHEN tp.target_state_id = v_entrega_id THEN 'ESTADO_CONFIRMADO_CLIENTE'
            ELSE 'ESTADO_CORREGIDO'
        END,
        'MIGRACION_V119',
        FALSE,
        FALSE,
        'reparacion-historica-v119:' || tp.paquete_id || ':' || tp.target_state_id,
        json_build_object(
            'migrationRun', 'V119',
            'entityType', 'PAQUETE',
            'sourceRelation', tp.source_relation,
            'sourceId', tp.source_id,
            'previousState', tp.estado_actual_codigo,
            'targetState', tp.target_state_codigo,
            'calculationRule', 'Piso operativo del paquete',
            'historicalTimestamp', to_char(tp.fecha_usada, 'YYYY-MM-DD"T"HH24:MI:SS')
        )::text,
        tp.fecha_usada,
        tp.fecha_usada
    FROM temp_paquete_candidatos tp
    WHERE tp.es_corregible IS TRUE
      AND NOT EXISTS (
          SELECT 1 FROM paquete_estado_evento pee
          WHERE pee.idempotency_key = 'reparacion-historica-v119:' || tp.paquete_id || ':' || tp.target_state_id
      );

    GET DIAGNOSTICS c_eventos_insertados = ROW_COUNT;

    -- 5. Reconciliar guías master corregibles
    DECLARE
        r_guia RECORD;
        v_fecha_recepcion_guia TIMESTAMP;
        v_fecha_despacho_guia TIMESTAMP;
        v_fecha_cierre_guia TIMESTAMP;
        v_consignatario_version_id BIGINT;
    BEGIN
        FOR r_guia IN (
            SELECT 
                tg.guia_id, tg.estado_actual, tg.estado_sugerido, tg.total_esperadas, 
                tg.registradas, tg.en_recepcion, tg.en_consolidado, tg.despachadas,
                gm.consignatario_id, gm.consignatario_version_id, gm.fecha_primera_recepcion, gm.fecha_primera_pieza_despachada
            FROM temp_guia_candidatos tg
            JOIN guia_master gm ON tg.guia_id = gm.id
            WHERE tg.es_corregible IS TRUE
        ) LOOP
            -- Actualizar fecha_primera_recepcion
            IF r_guia.en_recepcion > 0 AND r_guia.fecha_primera_recepcion IS NULL THEN
                SELECT MIN(fecha_estado_actual_desde) INTO v_fecha_recepcion_guia 
                FROM paquete 
                WHERE guia_master_id = r_guia.guia_id AND estado_rastreo_id = v_bodega_id;
                
                UPDATE guia_master SET fecha_primera_recepcion = COALESCE(v_fecha_recepcion_guia, NOW()) WHERE id = r_guia.guia_id;
            END IF;

            -- Actualizar fecha_primera_pieza_despachada
            IF r_guia.despachadas > 0 AND r_guia.fecha_primera_pieza_despachada IS NULL THEN
                SELECT MIN(d.fecha_hora) INTO v_fecha_despacho_guia 
                FROM saca s JOIN despacho d ON s.despacho_id = d.id 
                WHERE s.id IN (SELECT saca_id FROM paquete WHERE guia_master_id = r_guia.guia_id);
                
                UPDATE guia_master SET fecha_primera_pieza_despachada = COALESCE(v_fecha_despacho_guia, NOW()) WHERE id = r_guia.guia_id;
            END IF;

            -- Congelar consignatario_version_id
            IF r_guia.despachadas > 0 AND r_guia.consignatario_version_id IS NULL AND r_guia.consignatario_id IS NOT NULL THEN
                SELECT cv.id INTO v_consignatario_version_id 
                FROM consignatario_version cv 
                WHERE cv.consignatario_id = r_guia.consignatario_id AND cv.valid_to IS NULL
                LIMIT 1;
                
                IF v_consignatario_version_id IS NOT NULL THEN
                    UPDATE guia_master 
                    SET consignatario_version_id = v_consignatario_version_id,
                        consignatario_congelado_en = NOW()
                    WHERE id = r_guia.guia_id;
                END IF;
            END IF;

            -- Actualizar estado global y campos de cierre si completado
            IF r_guia.estado_sugerido = 'DESPACHO_COMPLETADO' THEN
                SELECT MAX(d.fecha_hora) INTO v_fecha_cierre_guia 
                FROM saca s JOIN despacho d ON s.despacho_id = d.id 
                WHERE s.id IN (SELECT saca_id FROM paquete WHERE guia_master_id = r_guia.guia_id);
                
                UPDATE guia_master 
                SET estado_global = r_guia.estado_sugerido::varchar(30),
                    cerrada_en = COALESCE(v_fecha_cierre_guia, NOW()),
                    tipo_cierre = 'DESPACHO_COMPLETADO',
                    motivo_cierre = 'Todas las piezas fueron despachadas',
                    version = version + 1
                WHERE id = r_guia.guia_id;
            ELSE
                UPDATE guia_master 
                SET estado_global = r_guia.estado_sugerido::varchar(30),
                    version = version + 1
                WHERE id = r_guia.guia_id;
            END IF;

            -- Registrar en el historial de guía master
            INSERT INTO guia_master_estado_historial (
                guia_master_id, estado_anterior, estado_nuevo, tipo_cambio, motivo, cambiado_en
            ) VALUES (
                r_guia.guia_id,
                r_guia.estado_actual,
                r_guia.estado_sugerido,
                'RECALCULO_AUTOMATICO',
                json_build_object(
                    'migrationRun', 'V119',
                    'entityType', 'GUIA_MASTER',
                    'previousState', r_guia.estado_actual,
                    'targetState', r_guia.estado_sugerido,
                    'calculationRule', 'Reconciliacion de guias',
                    'historicalTimestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS')
                )::text,
                NOW()
            );

            -- Auditoría
            INSERT INTO migracion_auditoria_v119 (entidad, entidad_id, estado_anterior, estado_nuevo, fecha_usada, razon, metadata_json)
            VALUES (
                'GUIA_MASTER',
                r_guia.guia_id,
                r_guia.estado_actual,
                r_guia.estado_sugerido,
                NOW(),
                'RECONCILIACION_GUIA',
                json_build_object(
                    'migrationRun', 'V119',
                    'entityType', 'GUIA_MASTER',
                    'previousState', r_guia.estado_actual,
                    'targetState', r_guia.estado_sugerido,
                    'calculationRule', 'Reconciliacion de guias',
                    'historicalTimestamp', to_char(NOW(), 'YYYY-MM-DD"T"HH24:MI:SS')
                )::text
            );

            c_guias_recalculadas := c_guias_recalculadas + 1;
        END LOOP;
    END;


    -- ----------------------------------------------------
    -- VALIDACIONES POST-MIGRACIÓN
    -- ----------------------------------------------------
    -- 3a. Consolidados rezagados restantes (excluyendo ambiguos)
    SELECT COUNT(*) INTO c_post_consolidados_rezagados
    FROM (
        SELECT
            ec.id,
            CASE
                WHEN ec.estado_operativo IN ('CANCELADO', 'LIQUIDADO') THEN ec.estado_operativo::text
                WHEN EXISTS (
                    SELECT 1 FROM lote_recepcion_guia lrg 
                    WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                ) OR COALESCE((
                    SELECT MAX(COALESCE(er.orden, er.orden_tracking))
                    FROM paquete p
                    JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
                    WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
                ), 0) >= v_bodega_orden THEN 'RECIBIDO_EN_BODEGA'
                WHEN ec.fecha_arribo_ecuador IS NOT NULL OR COALESCE((
                    SELECT MAX(COALESCE(er.orden, er.orden_tracking))
                    FROM paquete p
                    JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
                    WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
                ), 0) >= v_aduana_orden THEN 'ARRIBADO_ECUADOR'
                WHEN ec.fecha_cerrado IS NOT NULL OR COALESCE((
                    SELECT MAX(COALESCE(er.orden, er.orden_tracking))
                    FROM paquete p
                    JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
                    WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
                ), 0) >= v_vuelo_orden THEN 'ENVIADO_DESDE_USA'
                WHEN ec.fecha_cierre IS NOT NULL OR COALESCE((
                    SELECT MAX(COALESCE(er.orden, er.orden_tracking))
                    FROM paquete p
                    JOIN estado_rastreo er ON p.estado_rastreo_id = er.id
                    WHERE p.envio_consolidado_id = ec.id AND er.tipo_flujo = 'NORMAL'
                ), 0) >= v_manifestado_orden THEN 'CERRADO'
                WHEN (SELECT COUNT(*) FROM paquete p WHERE p.envio_consolidado_id = ec.id) > 0 THEN 'EN_PREPARACION'
                WHEN (SELECT COUNT(*) FROM paquete p WHERE p.envio_consolidado_id = ec.id) = 0 AND ec.estado_operativo = 'EN_PREPARACION' THEN 'VACIO'
                ELSE ec.estado_operativo::text
            END AS estado_sugerido
        FROM envio_consolidado ec
    ) sub
    WHERE sub.estado_sugerido <> (SELECT ec2.estado_operativo FROM envio_consolidado ec2 WHERE ec2.id = sub.id)
      AND NOT EXISTS (
          SELECT 1 FROM migracion_ambiguos_v119 ma 
          WHERE ma.entidad = 'CONSOLIDADO' AND ma.entidad_id = sub.id
      );

    -- 3b. Paquetes normales desalineados
    SELECT COUNT(*) INTO c_post_paquetes_desalineados
    FROM (
        SELECT
            p.id,
            COALESCE(er_origen.orden, er_origen.orden_tracking) AS orden_actual,
            GREATEST(
                v_registro_orden,
                COALESCE(
                    CASE 
                        WHEN ec.estado_operativo IN ('RECIBIDO_EN_BODEGA', 'LIQUIDADO') THEN v_bodega_orden
                        WHEN ec.estado_operativo = 'ARRIBADO_ECUADOR' THEN v_aduana_orden
                        WHEN ec.estado_operativo = 'ENVIADO_DESDE_USA' THEN v_vuelo_orden
                        WHEN ec.estado_operativo = 'CERRADO' THEN v_manifestado_orden
                        WHEN ec.estado_operativo = 'EN_PREPARACION' THEN v_planilla_orden
                        ELSE NULL
                    END,
                    0
                ),
                CASE 
                    WHEN (
                        (gm.tracking_base IS NOT NULL AND EXISTS (
                            SELECT 1 FROM lote_recepcion_guia lrg 
                            WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(gm.tracking_base))
                        )) OR (ec.codigo IS NOT NULL AND EXISTS (
                            SELECT 1 FROM lote_recepcion_guia lrg 
                            WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                        )) OR (ec.estado_operativo IN ('RECIBIDO_EN_BODEGA', 'LIQUIDADO'))
                    ) THEN v_bodega_orden
                    ELSE 0
                END,
                CASE 
                    WHEN p.saca_id IS NOT NULL AND EXISTS (
                        SELECT 1 FROM saca s WHERE s.id = p.saca_id AND s.despacho_id IS NOT NULL
                    ) THEN v_despacho_orden
                    ELSE 0
                END,
                CASE 
                    WHEN p.estado_rastreo_id = v_entrega_id OR EXISTS (
                        SELECT 1 FROM paquete_estado_evento pee 
                        WHERE pee.paquete_id = p.id AND pee.estado_destino_id = v_entrega_id
                    ) THEN v_entrega_orden
                    ELSE 0
                END
            ) AS target_orden
        FROM paquete p
        JOIN estado_rastreo er_origen ON p.estado_rastreo_id = er_origen.id
        LEFT JOIN envio_consolidado ec ON p.envio_consolidado_id = ec.id
        LEFT JOIN guia_master gm ON p.guia_master_id = gm.id
        WHERE p.bloqueado IS NOT TRUE
          AND p.en_flujo_alterno IS NOT TRUE
          AND er_origen.tipo_flujo = 'NORMAL'
          AND NOT EXISTS (
              SELECT 1 FROM revision_paquete rp
              WHERE rp.paquete_id = p.id AND rp.estado = 'EN_REVISION'
          )
          AND er_origen.codigo NOT LIKE '%RETENIDO%'
          AND er_origen.codigo NOT LIKE '%DEVUELTO%'
          AND er_origen.codigo NOT LIKE '%CANCELADO%'
    ) sub
    WHERE sub.orden_actual < sub.target_orden;

    -- 3c. Guías master sin recalcular
    SELECT COUNT(*) INTO c_post_guias_sin_recalcular
    FROM (
        SELECT
            gm.id,
            gm.estado_global::text AS estado_actual,
            CASE
                WHEN SUM(CASE WHEN p.saca_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM saca s WHERE s.id = p.saca_id AND s.despacho_id IS NOT NULL
                ) THEN 1 ELSE 0 END) > 0 THEN
                    CASE 
                        WHEN gm.total_piezas_esperadas IS NOT NULL AND gm.total_piezas_esperadas >= 1 THEN
                            CASE WHEN COUNT(*) >= gm.total_piezas_esperadas AND SUM(CASE WHEN p.saca_id IS NOT NULL AND EXISTS (
                                SELECT 1 FROM saca s WHERE s.id = p.saca_id AND s.despacho_id IS NOT NULL
                            ) THEN 1 ELSE 0 END) >= gm.total_piezas_esperadas THEN 'DESPACHO_COMPLETADO' ELSE 'DESPACHO_PARCIAL' END
                        ELSE
                            CASE WHEN SUM(CASE WHEN p.saca_id IS NOT NULL AND EXISTS (
                                SELECT 1 FROM saca s WHERE s.id = p.saca_id AND s.despacho_id IS NOT NULL
                            ) THEN 1 ELSE 0 END) >= COUNT(*) THEN 'DESPACHO_COMPLETADO' ELSE 'DESPACHO_PARCIAL' END
                    END
                WHEN (
                    CASE 
                        WHEN gm.total_piezas_esperadas IS NOT NULL AND gm.total_piezas_esperadas >= 1 THEN
                            CASE WHEN COUNT(*) >= gm.total_piezas_esperadas AND SUM(CASE WHEN p.estado_rastreo_id = v_bodega_id THEN 1 ELSE 0 END) >= gm.total_piezas_esperadas THEN TRUE ELSE FALSE END
                        ELSE
                            CASE WHEN SUM(CASE WHEN p.estado_rastreo_id = v_bodega_id THEN 1 ELSE 0 END) >= COUNT(*) THEN TRUE ELSE FALSE END
                    END
                ) THEN 'RECEPCION_COMPLETA'
                WHEN SUM(CASE WHEN p.estado_rastreo_id = v_bodega_id THEN 1 ELSE 0 END) > 0 THEN 'RECEPCION_PARCIAL'
                WHEN SUM(CASE WHEN p.envio_consolidado_id IS NOT NULL THEN 1 ELSE 0 END) > 0 THEN
                    CASE 
                        WHEN gm.total_piezas_esperadas IS NOT NULL AND gm.total_piezas_esperadas >= 1 THEN
                            CASE WHEN COUNT(*) >= gm.total_piezas_esperadas AND SUM(CASE WHEN p.envio_consolidado_id IS NOT NULL THEN 1 ELSE 0 END) >= gm.total_piezas_esperadas THEN 'ENVIO_COMPLETO' ELSE 'ENVIO_PARCIAL' END
                        ELSE
                            CASE WHEN SUM(CASE WHEN p.envio_consolidado_id IS NOT NULL THEN 1 ELSE 0 END) >= COUNT(*) THEN 'ENVIO_COMPLETO' ELSE 'ENVIO_PARCIAL' END
                    END
                ELSE 'CON_PAQUETES_REGISTRADOS'
            END AS estado_sugerido
        FROM guia_master gm
        JOIN paquete p ON p.guia_master_id = gm.id
        WHERE gm.estado_global NOT IN ('CANCELADA', 'EN_REVISION', 'PENDIENTE_VERIFICACION', 'DESPACHO_COMPLETADO')
        GROUP BY gm.id, gm.estado_global, gm.total_piezas_esperadas
    ) sub
    WHERE sub.estado_actual <> sub.estado_sugerido;

    -- 3d. Eventos duplicados (via unique key)
    SELECT (COUNT(idempotency_key) - COUNT(DISTINCT idempotency_key)) INTO c_post_eventos_duplicados 
    FROM paquete_estado_evento;

    -- Insertar conteos finales en el reporte
    INSERT INTO migracion_reporte_v119 (clave, valor) VALUES
        ('post_consolidados_rezagados', c_post_consolidados_rezagados::text),
        ('post_paquetes_desalineados', c_post_paquetes_desalineados::text),
        ('post_guias_afectadas_sin_recalcular', c_post_guias_sin_recalcular::text),
        ('post_eventos_duplicados', c_post_eventos_duplicados::text),
        ('actualizacion_consolidados', c_consolidados_actualizados::text),
        ('actualizacion_paquetes', c_paquetes_actualizados::text),
        ('actualizacion_guias', c_guias_recalculadas::text),
        ('actualizacion_eventos', c_eventos_insertados::text);

END $$;
