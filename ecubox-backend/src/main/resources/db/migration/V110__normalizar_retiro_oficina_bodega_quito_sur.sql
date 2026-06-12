-- =====================================================================
-- V110: Normaliza como "retiro en oficina" los despachos historicos de
--       BODEGA QUITO SUR registrados con courier de entrega redundante.
--
-- Problema historico:
--   Antes de que el flujo de retiro presencial quedara bien definido,
--   algunos despachos a la agencia BODEGA QUITO SUR se registraron con
--   tipo_entrega = 'AGENCIA' pero ademas con courier_entrega_id apuntando
--   a un courier de entrega homonimo ("BODEGA QUITO SUR"). En el modelo
--   actual, un retiro en oficina se representa como:
--     - tipo_entrega       = 'AGENCIA'
--     - agencia_id         informado
--     - courier_entrega_id = NULL  (ver entity/Despacho.java)
--   El CHECK chk_despacho_tipo_entrega exige agencia_id para AGENCIA pero
--   no restringe courier_entrega_id, por eso la anomalia persistio.
--
-- Criterio de seleccion (todas las condiciones a la vez):
--   1. courier_entrega.nombre = 'BODEGA QUITO SUR' (TRIM + sin distinguir
--      mayusculas), resuelto a su id desde la tabla maestra;
--   2. agencia.nombre = 'BODEGA QUITO SUR' (idem), resuelto a su id;
--   3. despacho.tipo_entrega = 'AGENCIA';
--   4. despacho.courier_entrega_id todavia informado (= id del courier).
--
-- Columnas que se MODIFICAN:
--   - despacho.courier_entrega_id -> NULL (unico cambio funcional).
--
-- Columnas que deliberadamente se CONSERVAN:
--   - tipo_entrega ('AGENCIA'), agencia_id, agencia_version_id y
--     destino_congelado_en (trazabilidad SCD2 de V67 intacta);
--   - numero_guia (NO se reescribe al formato RET-AG-*: ese codigo se
--     autogenera solo para despachos nuevos);
--   - fecha_hora, operario_id, observaciones, codigo_precinto, version;
--   - relaciones con sacas, paquetes y estados de rastreo (no se tocan).
--
-- Estrategia de validacion:
--   - Si no existe el courier o la agencia objetivo, no hay nada que
--     normalizar: NO-OP con NOTICE (mantiene la migracion aplicable en
--     bases nuevas/limpias donde el dato historico no existe).
--   - Aborta con EXCEPTION (rollback de la migracion) si:
--       a) hay mas de un courier o mas de una agencia con ese nombre
--          (duplicados ambiguos: no se puede resolver el id con certeza);
--       b) existen despachos con esa agencia y ese courier pero con
--          tipo_entrega distinto de AGENCIA (no se convierten en silencio);
--       c) algun candidato tiene referencias de destino incompatibles
--          (consignatario o punto de entrega, vivos o congelados);
--       d) algun candidato congelado (destino_congelado_en NOT NULL)
--          carece de agencia_version_id o su snapshot apunta a otra
--          agencia (inconsistencia SCD2);
--       e) tras el UPDATE quedan despachos AGENCIA con ambos nombres y
--          courier informado (post-validacion).
--   - El UPDATE filtra por los ids concretos resueltos (no por nombre ni
--     solo por agencia) y exige courier_entrega_id = id objetivo, lo que
--     la hace idempotente: en una segunda ejecucion no hay candidatos.
-- =====================================================================
DO $$
DECLARE
    courier_ids BIGINT[];
    agencia_ids BIGINT[];
    v_courier_id BIGINT;
    v_agencia_id BIGINT;
    candidatos INT;
    incompatibles INT;
    actualizados INT;
    restantes INT;
BEGIN
    -- 1) Resolver ids desde las tablas maestras (TRIM + UPPER defensivo).
    --    En agencia se consideran tambien las borradas logicamente
    --    (deleted_at): los despachos historicos pueden apuntar a una.
    SELECT array_agg(id) INTO courier_ids
      FROM courier_entrega
     WHERE UPPER(TRIM(nombre)) = 'BODEGA QUITO SUR';

    SELECT array_agg(id) INTO agencia_ids
      FROM agencia
     WHERE UPPER(TRIM(nombre)) = 'BODEGA QUITO SUR';

    IF courier_ids IS NULL OR agencia_ids IS NULL THEN
        RAISE NOTICE 'V110: no existe courier de entrega y/o agencia "BODEGA QUITO SUR"; sin candidatos que normalizar (no-op).';
        RETURN;
    END IF;

    IF array_length(courier_ids, 1) > 1 THEN
        RAISE EXCEPTION 'V110: hay % couriers de entrega llamados "BODEGA QUITO SUR" (ids %); resolucion ambigua, normalizar el catalogo antes de migrar.',
            array_length(courier_ids, 1), courier_ids;
    END IF;
    IF array_length(agencia_ids, 1) > 1 THEN
        RAISE EXCEPTION 'V110: hay % agencias llamadas "BODEGA QUITO SUR" (ids %); resolucion ambigua, normalizar el catalogo antes de migrar.',
            array_length(agencia_ids, 1), agencia_ids;
    END IF;

    v_courier_id := courier_ids[1];
    v_agencia_id := agencia_ids[1];
    RAISE NOTICE 'V110: courier_entrega_id objetivo=%, agencia_id objetivo=%', v_courier_id, v_agencia_id;

    -- 2) Guarda: despachos con esa agencia y ese courier pero con otro
    --    tipo_entrega. El CHECK del esquema lo hace teoricamente imposible
    --    (AGENCIA es el unico tipo con agencia_id), pero si existieran no
    --    deben convertirse en silencio.
    SELECT count(*) INTO incompatibles
      FROM despacho d
     WHERE d.agencia_id = v_agencia_id
       AND d.courier_entrega_id = v_courier_id
       AND d.tipo_entrega <> 'AGENCIA';
    IF incompatibles > 0 THEN
        RAISE EXCEPTION 'V110: % despacho(s) con agencia y courier BODEGA QUITO SUR tienen tipo_entrega distinto de AGENCIA; revisar manualmente antes de migrar.',
            incompatibles;
    END IF;

    -- 3) Guarda: candidatos con referencias de destino incompatibles
    --    (un retiro en oficina no lleva consignatario ni punto de entrega,
    --    ni vivos ni congelados).
    SELECT count(*) INTO incompatibles
      FROM despacho d
     WHERE d.agencia_id = v_agencia_id
       AND d.courier_entrega_id = v_courier_id
       AND d.tipo_entrega = 'AGENCIA'
       AND (d.consignatario_id IS NOT NULL
         OR d.agencia_courier_entrega_id IS NOT NULL
         OR d.consignatario_version_id IS NOT NULL
         OR d.agencia_courier_entrega_version_id IS NOT NULL);
    IF incompatibles > 0 THEN
        RAISE EXCEPTION 'V110: % candidato(s) tienen referencias de destino incompatibles con retiro en oficina (consignatario/punto de entrega); revisar manualmente.',
            incompatibles;
    END IF;

    -- 4) Guarda SCD2: todo candidato congelado debe tener snapshot de
    --    agencia y ese snapshot debe pertenecer a la agencia objetivo.
    SELECT count(*) INTO incompatibles
      FROM despacho d
      LEFT JOIN agencia_version av ON av.id = d.agencia_version_id
     WHERE d.agencia_id = v_agencia_id
       AND d.courier_entrega_id = v_courier_id
       AND d.tipo_entrega = 'AGENCIA'
       AND d.destino_congelado_en IS NOT NULL
       AND (d.agencia_version_id IS NULL OR av.agencia_id IS DISTINCT FROM d.agencia_id);
    IF incompatibles > 0 THEN
        RAISE EXCEPTION 'V110: % candidato(s) congelados sin snapshot de agencia o con snapshot de otra agencia (inconsistencia SCD2); revisar manualmente.',
            incompatibles;
    END IF;

    -- 5) Conteo de candidatos (criterio completo, por ids concretos).
    SELECT count(*) INTO candidatos
      FROM despacho d
     WHERE d.agencia_id = v_agencia_id
       AND d.courier_entrega_id = v_courier_id
       AND d.tipo_entrega = 'AGENCIA';
    IF candidatos = 0 THEN
        RAISE NOTICE 'V110: 0 despachos por normalizar (ya consistente o sin historico); no-op.';
        RETURN;
    END IF;
    RAISE NOTICE 'V110: % despacho(s) candidatos a normalizar como retiro en oficina.', candidatos;

    -- 6) UPDATE: unico cambio funcional. Idempotente por construccion
    --    (la condicion courier_entrega_id = id objetivo deja de cumplirse).
    UPDATE despacho d
       SET courier_entrega_id = NULL
     WHERE d.agencia_id = v_agencia_id
       AND d.courier_entrega_id = v_courier_id
       AND d.tipo_entrega = 'AGENCIA';
    GET DIAGNOSTICS actualizados = ROW_COUNT;
    RAISE NOTICE 'V110: % despacho(s) normalizados (courier_entrega_id -> NULL).', actualizados;

    -- 7) Post-validacion por nombre (cinturon y tirantes): no debe quedar
    --    ningun despacho AGENCIA con ambos nombres y courier informado.
    SELECT count(*) INTO restantes
      FROM despacho d
      JOIN courier_entrega ce ON ce.id = d.courier_entrega_id
      JOIN agencia a ON a.id = d.agencia_id
     WHERE d.tipo_entrega = 'AGENCIA'
       AND UPPER(TRIM(ce.nombre)) = 'BODEGA QUITO SUR'
       AND UPPER(TRIM(a.nombre)) = 'BODEGA QUITO SUR';
    IF restantes > 0 THEN
        RAISE EXCEPTION 'V110: post-validacion fallida, quedan % despacho(s) AGENCIA de BODEGA QUITO SUR con courier informado.',
            restantes;
    END IF;
END $$;
