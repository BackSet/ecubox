-- V118: Reparación histórica de estados de consolidados, paquetes y guías.
--
-- Esta migración realiza una reparación controlada de inconsistencias en el histórico de estados
-- de envíos consolidados, paquetes y guías master, alineándolos con las reglas y configuraciones vigentes
-- de parámetros del sistema sin degradar estados avanzados, omitiendo alternos/bloqueados/en revisión,
-- usando fechas históricas verificables e insertando los eventos de tracking faltantes.

DO $$
DECLARE
    -- IDs de estado_rastreo
    v_planilla_id BIGINT;
    v_manifestado_id BIGINT;
    v_vuelo_id BIGINT;
    v_aduana_id BIGINT;
    v_bodega_id BIGINT;
    
    -- Ordenes efectivos
    v_planilla_orden INT;
    v_manifestado_orden INT;
    v_vuelo_orden INT;
    v_aduana_orden INT;
    v_bodega_orden INT;

    -- Contadores
    c_consolidados_rezagados INT := 0;
    c_paquetes_planilla INT := 0;
    c_paquetes_manifestado INT := 0;
    c_paquetes_vuelo INT := 0;
    c_paquetes_aduana INT := 0;
    c_paquetes_bodega INT := 0;
    
    c_excluidos_bloqueados INT := 0;
    c_excluidos_alternos INT := 0;
    c_excluidos_revision INT := 0;
    
    c_guias_afectadas INT := 0;
    c_eventos_faltantes INT := 0;
    
    c_post_consolidados_rezagados INT := 0;
    c_post_paquetes_desalineados INT := 0;
    c_eventos_insertados INT := 0;
    c_guias_recalculadas INT := 0;
BEGIN
    -- 1. Leer IDs desde parametros del sistema
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

    -- 2. Abortar si falta una configuración requerida
    IF v_planilla_id IS NULL OR v_manifestado_id IS NULL OR v_vuelo_id IS NULL OR v_aduana_id IS NULL OR v_bodega_id IS NULL THEN
        RAISE EXCEPTION 'Falta una configuracion requerida en parametro_sistema. Planilla: %, Manifestado: %, Vuelo: %, Aduana: %, Bodega: %',
            v_planilla_id, v_manifestado_id, v_vuelo_id, v_aduana_id, v_bodega_id;
    END IF;

    -- Obtener ordenes efectivos
    SELECT COALESCE(orden, orden_tracking) INTO v_planilla_orden FROM estado_rastreo WHERE id = v_planilla_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_manifestado_orden FROM estado_rastreo WHERE id = v_manifestado_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_vuelo_orden FROM estado_rastreo WHERE id = v_vuelo_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_aduana_orden FROM estado_rastreo WHERE id = v_aduana_id;
    SELECT COALESCE(orden, orden_tracking) INTO v_bodega_orden FROM estado_rastreo WHERE id = v_bodega_id;

    -- Crear tablas de auditoria de migración
    CREATE TABLE IF NOT EXISTS migracion_reporte_v118 (
        id SERIAL PRIMARY KEY,
        clave VARCHAR(100) NOT NULL UNIQUE,
        valor VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS migracion_auditoria_v118 (
        id SERIAL PRIMARY KEY,
        entidad VARCHAR(50) NOT NULL,
        entidad_id BIGINT NOT NULL,
        estado_anterior_id BIGINT,
        estado_anterior_codigo VARCHAR(100),
        estado_nuevo_id BIGINT,
        estado_nuevo_codigo VARCHAR(100),
        consolidado_id BIGINT,
        fecha_usada TIMESTAMP NOT NULL,
        razon VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Limpiar reportes previos en caso de re-run
    TRUNCATE TABLE migracion_reporte_v118;
    TRUNCATE TABLE migracion_auditoria_v118;

    -- Guardar configuraciones en el reporte
    INSERT INTO migracion_reporte_v118 (clave, valor) VALUES
        ('config_planilla_id', v_planilla_id::text),
        ('config_manifestado_id', v_manifestado_id::text),
        ('config_vuelo_id', v_vuelo_id::text),
        ('config_aduana_id', v_aduana_id::text),
        ('config_bodega_id', v_bodega_id::text);

    -- Conteo pre-migración: consolidados rezagados en lotes
    SELECT COUNT(*) INTO c_consolidados_rezagados
    FROM envio_consolidado ec
    WHERE ec.estado_operativo NOT IN ('RECIBIDO_EN_BODEGA', 'LIQUIDADO', 'CANCELADO')
      AND EXISTS (
          SELECT 1 FROM lote_recepcion_guia lrg
          WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
      );

    INSERT INTO migracion_reporte_v118 (clave, valor) VALUES ('pre_consolidados_rezagados', c_consolidados_rezagados::text);

    -- Registrar consolidados rezagados para auditoria
    INSERT INTO migracion_auditoria_v118 (entidad, entidad_id, estado_anterior_codigo, estado_nuevo_codigo, fecha_usada, razon)
    SELECT 
        'CONSOLIDADO', 
        ec.id, 
        ec.estado_operativo::text, 
        'RECIBIDO_EN_BODEGA', 
        COALESCE(
            (
                SELECT MIN(lr.fecha_recepcion)
                FROM lote_recepcion_guia lrg
                JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
            ),
            NOW()
        ), 
        'CONSOLIDADO_RECIBIDO_EN_LOTE'
    FROM envio_consolidado ec
    WHERE ec.estado_operativo NOT IN ('RECIBIDO_EN_BODEGA', 'LIQUIDADO', 'CANCELADO')
      AND EXISTS (
          SELECT 1 FROM lote_recepcion_guia lrg
          WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
      );

    -- Actualizar consolidados rezagados
    UPDATE envio_consolidado ec
    SET estado_operativo = 'RECIBIDO_EN_BODEGA',
        updated_at = NOW()
    FROM migracion_auditoria_v118 ma
    WHERE ma.entidad = 'CONSOLIDADO' 
      AND ma.entidad_id = ec.id;

    -- Conteo de exclusiones (paquetes con consolidado)
    SELECT COUNT(*) INTO c_excluidos_bloqueados FROM paquete p WHERE p.bloqueado IS TRUE AND p.envio_consolidado_id IS NOT NULL;
    SELECT COUNT(*) INTO c_excluidos_alternos 
    FROM paquete p 
    JOIN estado_rastreo er ON p.estado_rastreo_id = er.id 
    WHERE (p.en_flujo_alterno IS TRUE OR er.tipo_flujo = 'ALTERNO')
      AND p.envio_consolidado_id IS NOT NULL;
    SELECT COUNT(*) INTO c_excluidos_revision 
    FROM paquete p 
    JOIN revision_paquete rp ON p.id = rp.paquete_id 
    WHERE rp.estado = 'EN_REVISION'
      AND p.envio_consolidado_id IS NOT NULL;

    INSERT INTO migracion_reporte_v118 (clave, valor) VALUES
        ('pre_paquetes_excluidos_bloqueados', c_excluidos_bloqueados::text),
        ('pre_paquetes_excluidos_alternos', c_excluidos_alternos::text),
        ('pre_paquetes_excluidos_revision', c_excluidos_revision::text);

    -- Identificar y registrar candidatos de paquete en auditoría
    INSERT INTO migracion_auditoria_v118 (
        entidad, entidad_id, estado_anterior_id, estado_anterior_codigo,
        estado_nuevo_id, estado_nuevo_codigo, consolidado_id, fecha_usada, razon
    )
    WITH target_mapping AS (
        SELECT 
            p.id AS paquete_id,
            p.estado_rastreo_id AS estado_anterior_id,
            er_origen.codigo AS estado_anterior_codigo,
            COALESCE(er_origen.orden, er_origen.orden_tracking) AS orden_origen,
            ec.id AS consolidado_id,
            ec.estado_operativo AS consolidado_estado,
            -- Asignación de estado objetivo según el estado del consolidado
            CASE 
                WHEN ec.estado_operativo = 'RECIBIDO_EN_BODEGA' OR EXISTS (
                    SELECT 1 FROM lote_recepcion_guia lrg 
                    WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                ) THEN v_bodega_id
                WHEN ec.estado_operativo = 'ARRIBADO_ECUADOR' THEN v_aduana_id
                WHEN ec.estado_operativo = 'ENVIADO_DESDE_USA' THEN v_vuelo_id
                WHEN ec.estado_operativo = 'CERRADO' THEN v_manifestado_id
                ELSE v_planilla_id
            END AS estado_nuevo_id,
            -- Asignación de orden objetivo
            CASE 
                WHEN ec.estado_operativo = 'RECIBIDO_EN_BODEGA' OR EXISTS (
                    SELECT 1 FROM lote_recepcion_guia lrg 
                    WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                ) THEN v_bodega_orden
                WHEN ec.estado_operativo = 'ARRIBADO_ECUADOR' THEN v_aduana_orden
                WHEN ec.estado_operativo = 'ENVIADO_DESDE_USA' THEN v_vuelo_orden
                WHEN ec.estado_operativo = 'CERRADO' THEN v_manifestado_orden
                ELSE v_planilla_orden
            END AS estado_nuevo_orden,
            -- Resolución de fecha histórica
            COALESCE(
                -- Prioridad 1: Fecha del lote de recepción
                (
                    SELECT MIN(lr.fecha_recepcion)
                    FROM lote_recepcion_guia lrg
                    JOIN lote_recepcion lr ON lrg.lote_recepcion_id = lr.id
                    WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                ),
                -- Prioridad 2: Fecha histórica de cambio de estado en consolidado
                CASE 
                    WHEN ec.estado_operativo = 'ARRIBADO_ECUADOR' THEN ec.fecha_arribo_ecuador
                    WHEN ec.estado_operativo = 'ENVIADO_DESDE_USA' THEN ec.fecha_cerrado
                    WHEN ec.estado_operativo = 'CERRADO' THEN ec.fecha_cierre
                    ELSE NULL
                END,
                -- Prioridad 3: Fecha de evento de asociación
                (
                    SELECT MIN(pee.occurred_at)
                    FROM paquete_estado_evento pee
                    WHERE pee.paquete_id = p.id
                      AND pee.event_type = 'ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO'
                ),
                -- Prioridad 4: Fecha de creación
                ec.created_at,
                p.created_at
            ) AS fecha_usada
        FROM paquete p
        JOIN estado_rastreo er_origen ON p.estado_rastreo_id = er_origen.id
        JOIN envio_consolidado ec ON p.envio_consolidado_id = ec.id
        WHERE p.bloqueado IS NOT TRUE
          AND p.en_flujo_alterno IS NOT TRUE
          AND NOT EXISTS (
              SELECT 1 FROM revision_paquete rp
              WHERE rp.paquete_id = p.id AND rp.estado = 'EN_REVISION'
          )
          AND er_origen.tipo_flujo = 'NORMAL'
    )
    SELECT 
        'PAQUETE',
        tm.paquete_id,
        tm.estado_anterior_id,
        tm.estado_anterior_codigo,
        tm.estado_nuevo_id,
        er_dest.codigo,
        tm.consolidado_id,
        tm.fecha_usada,
        'REPARACION_ESTADO_LOGISTICO_CONSOLIDADO'
    FROM target_mapping tm
    JOIN estado_rastreo er_dest ON tm.estado_nuevo_id = er_dest.id
    WHERE tm.orden_origen < tm.estado_nuevo_orden;

    -- Conteos por cada estado objetivo para validación previa
    SELECT COUNT(*) INTO c_paquetes_planilla FROM migracion_auditoria_v118 WHERE entidad = 'PAQUETE' AND estado_nuevo_id = v_planilla_id;
    SELECT COUNT(*) INTO c_paquetes_manifestado FROM migracion_auditoria_v118 WHERE entidad = 'PAQUETE' AND estado_nuevo_id = v_manifestado_id;
    SELECT COUNT(*) INTO c_paquetes_vuelo FROM migracion_auditoria_v118 WHERE entidad = 'PAQUETE' AND estado_nuevo_id = v_vuelo_id;
    SELECT COUNT(*) INTO c_paquetes_aduana FROM migracion_auditoria_v118 WHERE entidad = 'PAQUETE' AND estado_nuevo_id = v_aduana_id;
    SELECT COUNT(*) INTO c_paquetes_bodega FROM migracion_auditoria_v118 WHERE entidad = 'PAQUETE' AND estado_nuevo_id = v_bodega_id;

    INSERT INTO migracion_reporte_v118 (clave, valor) VALUES
        ('pre_paquetes_planilla', c_paquetes_planilla::text),
        ('pre_paquetes_manifestado', c_paquetes_manifestado::text),
        ('pre_paquetes_vuelo', c_paquetes_vuelo::text),
        ('pre_paquetes_aduana', c_paquetes_aduana::text),
        ('pre_paquetes_bodega', c_paquetes_bodega::text);

    -- Conteos de guías afectadas por la reparación
    SELECT COUNT(DISTINCT p.guia_master_id) INTO c_guias_afectadas
    FROM paquete p
    JOIN migracion_auditoria_v118 ma ON ma.entidad_id = p.id AND ma.entidad = 'PAQUETE'
    WHERE p.guia_master_id IS NOT NULL;
    
    INSERT INTO migracion_reporte_v118 (clave, valor) VALUES ('pre_guias_afectadas', c_guias_afectadas::text);

    -- Ejecutar actualizaciones de paquetes rezagados
    UPDATE paquete p
    SET estado_rastreo_id = ma.estado_nuevo_id,
        fecha_estado_actual_desde = ma.fecha_usada,
        fecha_limite_retiro = NULL, -- Nulo para que el BackfillRunner de arranque lo re-poble
        version = version + 1
    FROM migracion_auditoria_v118 ma
    WHERE ma.entidad = 'PAQUETE'
      AND ma.entidad_id = p.id;

    -- Insertar eventos de rastreo faltantes inyectando metadata e idempotencia
    WITH event_candidates AS (
        SELECT 
            ma.entidad_id AS paquete_id,
            ma.estado_anterior_id,
            ma.estado_nuevo_id,
            ma.fecha_usada,
            p.numero_guia,
            ec.codigo AS consolidado_codigo,
            gm.tracking_base AS tracking_base,
            gm.id AS guia_master_id,
            p.pieza_numero,
            p.pieza_total,
            ma.consolidado_id,
            -- Resolviendo event_type
            CASE 
                WHEN ma.estado_nuevo_id = v_planilla_id THEN 'ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO'::varchar(60)
                WHEN ma.estado_nuevo_id = v_manifestado_id THEN 'ESTADO_APLICADO_CIERRE_CONSOLIDADO'::varchar(60)
                WHEN ma.estado_nuevo_id = v_vuelo_id THEN 'ESTADO_APLICADO_ENVIADO_USA'::varchar(60)
                WHEN ma.estado_nuevo_id = v_aduana_id THEN 'ESTADO_APLICADO_ARRIBO_ECUADOR'::varchar(60)
                ELSE 'ESTADO_REPARADO_LOTE_RECEPCION'::varchar(60)
            END AS event_type,
            'reparacion-historica-v118:' || ma.entidad_id || ':' || ma.estado_nuevo_id AS idempotency_key
        FROM migracion_auditoria_v118 ma
        JOIN paquete p ON ma.entidad_id = p.id
        LEFT JOIN envio_consolidado ec ON ma.consolidado_id = ec.id
        LEFT JOIN guia_master gm ON p.guia_master_id = gm.id
        WHERE ma.entidad = 'PAQUETE'
    )
    INSERT INTO paquete_estado_evento (
        event_id, paquete_id, estado_origen_id, estado_destino_id,
        event_type, event_source, en_flujo_alterno, bloqueado,
        idempotency_key, metadata_json, occurred_at, created_at
    )
    SELECT 
        gen_random_uuid(),
        ec.paquete_id,
        ec.estado_anterior_id,
        ec.estado_nuevo_id,
        ec.event_type::varchar(60),
        'MIGRACION_V118',
        FALSE,
        FALSE,
        ec.idempotency_key,
        ('{"reparacion": true, "migracion": "V118", "numeroGuia": "' || COALESCE(ec.numero_guia, '') 
         || '", "envioConsolidadoCodigo": "' || COALESCE(ec.consolidado_codigo, '') 
         || '", "trackingBase": "' || COALESCE(ec.tracking_base, '') 
         || '", "guiaMasterId": ' || COALESCE(ec.guia_master_id::text, 'null')
         || ', "piezaNumero": ' || COALESCE(ec.pieza_numero::text, 'null')
         || ', "piezaTotal": ' || COALESCE(ec.pieza_total::text, 'null')
         || ', "envioConsolidadoId": ' || COALESCE(ec.consolidado_id::text, 'null') || '}')::text,
        ec.fecha_usada,
        ec.fecha_usada
    FROM event_candidates ec
    WHERE NOT EXISTS (
        SELECT 1 FROM paquete_estado_evento pee
        WHERE pee.idempotency_key = ec.idempotency_key
    );

    GET DIAGNOSTICS c_eventos_insertados = ROW_COUNT;
    INSERT INTO migracion_reporte_v118 (clave, valor) VALUES ('eventos_insertados', c_eventos_insertados::text);

    -- Recalcular estados de guías master afectadas
    DECLARE
        r_guia RECORD;
        v_total_esperado INT;
        v_registradas INT;
        v_en_recepcion INT;
        v_en_consolidado INT;
        v_despachadas INT;
        
        v_despacho_completo BOOLEAN;
        v_recepcion_completa BOOLEAN;
        v_envio_completo BOOLEAN;
        
        v_nuevo_estado_guia VARCHAR(40);
        v_cambios_guia BOOLEAN;
        
        v_fecha_recepcion_guia TIMESTAMP;
        v_fecha_despacho_guia TIMESTAMP;
        v_fecha_cierre_guia TIMESTAMP;
    BEGIN
        FOR r_guia IN (
            SELECT DISTINCT p.guia_master_id AS id, gm.estado_global, gm.total_piezas_esperadas, 
                            gm.fecha_primera_recepcion, gm.fecha_primera_pieza_despachada
            FROM paquete p
            JOIN guia_master gm ON p.guia_master_id = gm.id
            JOIN migracion_auditoria_v118 ma ON ma.entidad_id = p.id AND ma.entidad = 'PAQUETE'
            WHERE gm.estado_global NOT IN ('DESPACHO_COMPLETADO', 'CANCELADA', 'EN_REVISION')
        ) LOOP
            v_total_esperado := r_guia.total_piezas_esperadas;
            v_cambios_guia := FALSE;
            
            -- Obtener conteos actualizados
            SELECT COUNT(*) INTO v_registradas FROM paquete WHERE guia_master_id = r_guia.id;
            SELECT COUNT(*) INTO v_en_recepcion FROM paquete WHERE guia_master_id = r_guia.id AND estado_rastreo_id = v_bodega_id;
            SELECT COUNT(*) INTO v_en_consolidado FROM paquete WHERE guia_master_id = r_guia.id AND envio_consolidado_id IS NOT NULL;
            SELECT COUNT(*) INTO v_despachadas FROM paquete p JOIN saca s ON p.saca_id = s.id 
                                                 WHERE p.guia_master_id = r_guia.id AND s.despacho_id IS NOT NULL;

            -- 1. Despacho
            IF v_despachadas > 0 THEN
                IF v_total_esperado IS NOT NULL AND v_total_esperado >= 1 THEN
                    v_despacho_completo := (v_registradas >= v_total_esperado AND v_despachadas >= v_total_esperado);
                ELSE
                    v_despacho_completo := (v_despachadas >= v_registradas);
                END IF;
                
                IF v_despacho_completo THEN
                    v_nuevo_estado_guia := 'DESPACHO_COMPLETADO';
                ELSE
                    v_nuevo_estado_guia := 'DESPACHO_PARCIAL';
                END IF;
            -- 2. Recepción
            ELSE
                IF v_total_esperado IS NOT NULL AND v_total_esperado >= 1 THEN
                    v_recepcion_completa := (v_registradas >= v_total_esperado AND v_en_recepcion >= v_total_esperado);
                ELSE
                    v_recepcion_completa := (v_en_recepcion >= v_registradas);
                END IF;
                
                IF v_recepcion_completa THEN
                    v_nuevo_estado_guia := 'RECEPCION_COMPLETA';
                ELSIF v_en_recepcion > 0 THEN
                    v_nuevo_estado_guia := 'RECEPCION_PARCIAL';
                -- 3. Consolidación
                ELSIF v_en_consolidado > 0 THEN
                    IF v_total_esperado IS NOT NULL AND v_total_esperado >= 1 THEN
                        v_envio_completo := (v_registradas >= v_total_esperado AND v_en_consolidado >= v_total_esperado);
                    ELSE
                        v_envio_completo := (v_en_consolidado >= v_registradas);
                    END IF;
                    
                    IF v_envio_completo THEN
                        v_nuevo_estado_guia := 'ENVIO_COMPLETO';
                    ELSE
                        v_nuevo_estado_guia := 'ENVIO_PARCIAL';
                    END IF;
                ELSE
                    v_nuevo_estado_guia := 'CON_PAQUETES_REGISTRADOS';
                END IF;
            END IF;

            -- Fechas y SCD2
            IF v_en_recepcion > 0 AND r_guia.fecha_primera_recepcion IS NULL THEN
                SELECT MIN(fecha_estado_actual_desde) INTO v_fecha_recepcion_guia FROM paquete 
                WHERE guia_master_id = r_guia.id AND estado_rastreo_id = v_bodega_id;
                
                UPDATE guia_master SET fecha_primera_recepcion = COALESCE(v_fecha_recepcion_guia, NOW()) WHERE id = r_guia.id;
                v_cambios_guia := TRUE;
            END IF;

            IF v_despachadas > 0 AND r_guia.fecha_primera_pieza_despachada IS NULL THEN
                SELECT MIN(d.fecha_hora) INTO v_fecha_despacho_guia 
                FROM saca s JOIN despacho d ON s.despacho_id = d.id 
                WHERE s.id IN (SELECT saca_id FROM paquete WHERE guia_master_id = r_guia.id);
                
                UPDATE guia_master SET fecha_primera_pieza_despachada = COALESCE(v_fecha_despacho_guia, NOW()) WHERE id = r_guia.id;
                v_cambios_guia := TRUE;
            END IF;

            -- Guardar y registrar historial si cambia el estado
            IF v_nuevo_estado_guia <> r_guia.estado_global::text THEN
                -- Cierre si completado
                IF v_nuevo_estado_guia = 'DESPACHO_COMPLETADO' THEN
                    SELECT MAX(d.fecha_hora) INTO v_fecha_cierre_guia 
                    FROM saca s JOIN despacho d ON s.despacho_id = d.id 
                    WHERE s.id IN (SELECT saca_id FROM paquete WHERE guia_master_id = r_guia.id);
                    
                    UPDATE guia_master 
                    SET estado_global = v_nuevo_estado_guia::varchar(30),
                        cerrada_en = COALESCE(v_fecha_cierre_guia, NOW()),
                        tipo_cierre = 'DESPACHO_COMPLETADO',
                        motivo_cierre = 'Todas las piezas fueron despachadas'
                    WHERE id = r_guia.id;
                ELSE
                    UPDATE guia_master SET estado_global = v_nuevo_estado_guia::varchar(30) WHERE id = r_guia.id;
                END IF;

                -- Insertar historial
                INSERT INTO guia_master_estado_historial (
                    guia_master_id, estado_anterior, estado_nuevo, tipo_cambio, motivo, cambiado_en
                ) VALUES (
                    r_guia.id,
                    r_guia.estado_global::text,
                    v_nuevo_estado_guia,
                    'RECALCULO_AUTOMATICO',
                    'Recalculo automatico por reparacion historica (V118)',
                    NOW()
                );
                
                c_guias_recalculadas := c_guias_recalculadas + 1;
                v_cambios_guia := TRUE;
            END IF;
            
            IF v_cambios_guia THEN
                UPDATE guia_master SET version = version + 1 WHERE id = r_guia.id;
            END IF;
        END LOOP;
    END;

    INSERT INTO migracion_reporte_v118 (clave, valor) VALUES ('recalc_guias_procesadas', c_guias_recalculadas::text);

    -- 3. Validación posterior
    -- 3a. Consolidados rezagados
    SELECT COUNT(*) INTO c_post_consolidados_rezagados
    FROM envio_consolidado ec
    WHERE ec.estado_operativo NOT IN ('RECIBIDO_EN_BODEGA', 'LIQUIDADO', 'CANCELADO')
      AND EXISTS (
          SELECT 1 FROM lote_recepcion_guia lrg
          WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
      );
    
    -- 3b. Paquetes desalineados
    WITH post_mapping AS (
        SELECT 
            p.id AS paquete_id,
            COALESCE(er_origen.orden, er_origen.orden_tracking) AS orden_origen,
            CASE 
                WHEN ec.estado_operativo = 'RECIBIDO_EN_BODEGA' OR EXISTS (
                    SELECT 1 FROM lote_recepcion_guia lrg 
                    WHERE LOWER(TRIM(lrg.numero_guia_envio)) = LOWER(TRIM(ec.codigo))
                ) THEN v_bodega_orden
                WHEN ec.estado_operativo = 'ARRIBADO_ECUADOR' THEN v_aduana_orden
                WHEN ec.estado_operativo = 'ENVIADO_DESDE_USA' THEN v_vuelo_orden
                WHEN ec.estado_operativo = 'CERRADO' THEN v_manifestado_orden
                ELSE v_planilla_orden
            END AS estado_nuevo_orden
        FROM paquete p
        JOIN estado_rastreo er_origen ON p.estado_rastreo_id = er_origen.id
        JOIN envio_consolidado ec ON p.envio_consolidado_id = ec.id
        WHERE p.bloqueado IS NOT TRUE
          AND p.en_flujo_alterno IS NOT TRUE
          AND NOT EXISTS (
              SELECT 1 FROM revision_paquete rp
              WHERE rp.paquete_id = p.id AND rp.estado = 'EN_REVISION'
          )
          AND er_origen.tipo_flujo = 'NORMAL'
    )
    SELECT COUNT(*) INTO c_post_paquetes_desalineados
    FROM post_mapping
    WHERE orden_origen < estado_nuevo_orden;

    INSERT INTO migracion_reporte_v118 (clave, valor) VALUES
        ('post_consolidados_rezagados', c_post_consolidados_rezagados::text),
        ('post_paquetes_desalineados', c_post_paquetes_desalineados::text);

END $$;
