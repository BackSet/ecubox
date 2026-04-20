-- =====================================================================
-- V71: Refactor de nomenclatura al glosario canonico de la industria
--      courier internacional.
--
-- Resumen de renames (ver docs/nomenclatura.md):
--   distribuidor                      -> courier_entrega
--   destinatario_final                -> consignatario
--   destinatario_final_version        -> consignatario_version
--   *.destinatario_final_id           -> *.consignatario_id
--   *.distribuidor_id                 -> *.courier_entrega_id
--   *.destinatario_version_id         -> *.consignatario_version_id
--   permiso DISTRIBUIDORES_*          -> COURIERS_ENTREGA_*
--   permiso DESTINATARIOS_*           -> CONSIGNATARIOS_*
--   codigo_secuencia.entity DESTINATARIO_FINAL -> CONSIGNATARIO
--
-- Esta migracion solo toca metadatos (nombres). NO altera datos del
-- negocio. Es compatible con V68 (codigo_secuencia) y V69 (fix refs).
-- Los IDs de los registros NO cambian.
--
-- IDEMPOTENCIA: cada rename verifica primero si el objeto fuente existe.
-- Esto permite re-ejecutar la migracion en bases que tengan estado
-- parcial (p.ej. indices opcionales no creados, constraints renombradas
-- a mano, etc.) sin reventar.
-- =====================================================================

-- =====================================================================
-- 1) Renombrar tabla distribuidor -> courier_entrega y sus FKs/indices
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'distribuidor' AND relkind = 'r') THEN
    ALTER TABLE distribuidor RENAME TO courier_entrega;
  END IF;
END $$;

-- FK desde manifiesto
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'manifiesto' AND column_name = 'filtro_distribuidor_id') THEN
    ALTER TABLE manifiesto RENAME COLUMN filtro_distribuidor_id TO filtro_courier_entrega_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_manifiesto_filtro_distribuidor' AND relkind = 'i') THEN
    ALTER INDEX idx_manifiesto_filtro_distribuidor RENAME TO idx_manifiesto_filtro_courier_entrega;
  END IF;
END $$;

-- FK desde despacho
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'despacho' AND column_name = 'distribuidor_id') THEN
    ALTER TABLE despacho RENAME COLUMN distribuidor_id TO courier_entrega_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_despacho_distribuidor_id' AND relkind = 'i') THEN
    ALTER INDEX idx_despacho_distribuidor_id RENAME TO idx_despacho_courier_entrega_id;
  END IF;
END $$;

-- FK desde agencia_distribuidor
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'agencia_distribuidor' AND column_name = 'distribuidor_id') THEN
    ALTER TABLE agencia_distribuidor RENAME COLUMN distribuidor_id TO courier_entrega_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_agencia_distribuidor_distribuidor_id' AND relkind = 'i') THEN
    ALTER INDEX idx_agencia_distribuidor_distribuidor_id RENAME TO idx_agencia_distribuidor_courier_entrega_id;
  END IF;
END $$;

-- Indice unico parcial creado en V67 (puede no existir en bases antiguas)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_agencia_distribuidor_distribuidor_codigo_vivos' AND relkind = 'i') THEN
    ALTER INDEX uq_agencia_distribuidor_distribuidor_codigo_vivos
        RENAME TO uq_agencia_distribuidor_courier_entrega_codigo_vivos;
  END IF;
END $$;

-- FK desde agencia_distribuidor_version
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'agencia_distribuidor_version' AND column_name = 'distribuidor_id') THEN
    ALTER TABLE agencia_distribuidor_version RENAME COLUMN distribuidor_id TO courier_entrega_id;
  END IF;
END $$;

-- =====================================================================
-- 2) Renombrar tabla destinatario_final -> consignatario y FKs/indices
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'destinatario_final' AND relkind = 'r') THEN
    ALTER TABLE destinatario_final RENAME TO consignatario;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_destinatario_final_usuario_id' AND relkind = 'i') THEN
    ALTER INDEX idx_destinatario_final_usuario_id RENAME TO idx_consignatario_usuario_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_destinatario_final_activos' AND relkind = 'i') THEN
    ALTER INDEX idx_destinatario_final_activos RENAME TO idx_consignatario_activos;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'uq_destinatario_final_codigo_vivos' AND relkind = 'i') THEN
    ALTER INDEX uq_destinatario_final_codigo_vivos RENAME TO uq_consignatario_codigo_vivos;
  END IF;
END $$;

-- FK desde paquete
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'paquete' AND column_name = 'destinatario_final_id') THEN
    ALTER TABLE paquete RENAME COLUMN destinatario_final_id TO consignatario_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_paquete_destinatario_final_id' AND relkind = 'i') THEN
    ALTER INDEX idx_paquete_destinatario_final_id RENAME TO idx_paquete_consignatario_id;
  END IF;
END $$;

-- FK desde guia_master
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'guia_master' AND column_name = 'destinatario_final_id') THEN
    ALTER TABLE guia_master RENAME COLUMN destinatario_final_id TO consignatario_id;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_guia_master_destinatario' AND relkind = 'i') THEN
    ALTER INDEX idx_guia_master_destinatario RENAME TO idx_guia_master_consignatario;
  END IF;
END $$;

-- FK desde despacho
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'despacho' AND column_name = 'destinatario_final_id') THEN
    ALTER TABLE despacho RENAME COLUMN destinatario_final_id TO consignatario_id;
  END IF;
END $$;

-- =====================================================================
-- 3) Renombrar tabla destinatario_final_version -> consignatario_version
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'destinatario_final_version' AND relkind = 'r') THEN
    ALTER TABLE destinatario_final_version RENAME TO consignatario_version;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'consignatario_version' AND column_name = 'destinatario_final_id') THEN
    ALTER TABLE consignatario_version RENAME COLUMN destinatario_final_id TO consignatario_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_dfv_master_actual' AND relkind = 'i') THEN
    ALTER INDEX idx_dfv_master_actual RENAME TO idx_consignatario_version_actual;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_dfv_master_id' AND relkind = 'i') THEN
    ALTER INDEX idx_dfv_master_id RENAME TO idx_consignatario_version_master_id;
  END IF;
END $$;

-- Constraint UNIQUE compuesta
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE table_name = 'consignatario_version' AND constraint_name = 'uq_dfv_master_valid_from') THEN
    ALTER TABLE consignatario_version
        RENAME CONSTRAINT uq_dfv_master_valid_from TO uq_consignatario_version_valid_from;
  END IF;
END $$;

-- FKs desde guia_master.destinatario_version_id y despacho.destinatario_version_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'guia_master' AND column_name = 'destinatario_version_id') THEN
    ALTER TABLE guia_master RENAME COLUMN destinatario_version_id TO consignatario_version_id;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'guia_master' AND column_name = 'destinatario_congelado_en') THEN
    ALTER TABLE guia_master RENAME COLUMN destinatario_congelado_en TO consignatario_congelado_en;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'despacho' AND column_name = 'destinatario_version_id') THEN
    ALTER TABLE despacho RENAME COLUMN destinatario_version_id TO consignatario_version_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_guia_master_destinatario_version' AND relkind = 'i') THEN
    ALTER INDEX idx_guia_master_destinatario_version RENAME TO idx_guia_master_consignatario_version;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_despacho_destinatario_version' AND relkind = 'i') THEN
    ALTER INDEX idx_despacho_destinatario_version RENAME TO idx_despacho_consignatario_version;
  END IF;
END $$;

-- =====================================================================
-- 4) Renombrar CHECK constraints que referencian columnas renombradas
--
-- PostgreSQL actualiza automaticamente las referencias internas a las
-- columnas renombradas dentro de las CHECK constraints, pero el nombre
-- de la constraint se mantiene. Lo renombramos para legibilidad.
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints
             WHERE table_name = 'guia_master'
               AND constraint_name = 'chk_guia_master_destinatario_congelado_consistente') THEN
    ALTER TABLE guia_master
        RENAME CONSTRAINT chk_guia_master_destinatario_congelado_consistente
        TO chk_guia_master_consignatario_congelado_consistente;
  END IF;
END $$;

-- chk_despacho_destino_congelado_consistente: mismo nombre semantico, no se renombra.
-- chk_despacho_tipo_entrega: la condicion usaba destinatario_final_id, que ya
-- quedo como consignatario_id (PostgreSQL actualizo la condicion). El nombre
-- se mantiene porque sigue describiendo el "tipo_entrega".
-- chk_paquete_pieza_numero_valida: no afectada.

-- =====================================================================
-- 5) Renombrar permisos
-- =====================================================================

UPDATE permiso SET codigo = 'COURIERS_ENTREGA_READ',
                   descripcion = 'Ver listado y detalle de couriers de entrega'
 WHERE codigo = 'DISTRIBUIDORES_READ';

UPDATE permiso SET codigo = 'COURIERS_ENTREGA_WRITE',
                   descripcion = 'Crear, editar y eliminar couriers de entrega'
 WHERE codigo = 'DISTRIBUIDORES_WRITE';

UPDATE permiso SET codigo = 'CONSIGNATARIOS_READ',
                   descripcion = 'Ver listado y detalle de mis consignatarios'
 WHERE codigo = 'DESTINATARIOS_READ';

UPDATE permiso SET codigo = 'CONSIGNATARIOS_CREATE',
                   descripcion = 'Crear consignatario'
 WHERE codigo = 'DESTINATARIOS_CREATE';

UPDATE permiso SET codigo = 'CONSIGNATARIOS_UPDATE',
                   descripcion = 'Editar mis consignatarios'
 WHERE codigo = 'DESTINATARIOS_UPDATE';

UPDATE permiso SET codigo = 'CONSIGNATARIOS_DELETE',
                   descripcion = 'Eliminar mis consignatarios'
 WHERE codigo = 'DESTINATARIOS_DELETE';

UPDATE permiso SET codigo = 'CONSIGNATARIOS_OPERARIO',
                   descripcion = 'Listar todos los consignatarios y editar codigo/cualquiera'
 WHERE codigo = 'DESTINATARIOS_OPERARIO';

-- =====================================================================
-- 6) Renombrar entidad en codigo_secuencia
--
-- scope_key sigue siendo el mismo ID (PAQUETE_REF usa consignatario.id,
-- AGENCIA_DISTRIBUIDOR usa courier_entrega.id) por lo que los valores
-- siguen siendo correctos.
-- =====================================================================

UPDATE codigo_secuencia
   SET entity = 'CONSIGNATARIO'
 WHERE entity = 'DESTINATARIO_FINAL';

-- =====================================================================
-- 7) Comentarios actualizados (solo si las tablas existen)
-- =====================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'consignatario' AND relkind = 'r') THEN
    EXECUTE 'COMMENT ON TABLE consignatario IS ''Consignatario: persona o empresa que recibe el paquete en Ecuador. Pertenece a un usuario (cliente del casillero).''';
    EXECUTE 'COMMENT ON COLUMN consignatario.deleted_at IS ''Soft-delete: si es NOT NULL, el consignatario esta dado de baja y no aparece en listados vivos.''';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'courier_entrega' AND relkind = 'r') THEN
    EXECUTE 'COMMENT ON TABLE courier_entrega IS ''Courier de entrega: empresa de paqueteria de ultima milla que entrega los paquetes al consignatario en Ecuador.''';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'consignatario_version' AND relkind = 'r') THEN
    EXECUTE 'COMMENT ON TABLE consignatario_version IS ''Snapshots inmutables de consignatario (SCD Tipo 2). valid_to NULL = version vigente.''';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'despacho' AND relkind = 'r') THEN
    EXECUTE 'COMMENT ON TABLE despacho IS ''Despacho: salida del paquete desde bodega Ecuador hacia el consignatario, via courier de entrega o retiro en agencia.''';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'manifiesto' AND relkind = 'r') THEN
    EXECUTE 'COMMENT ON TABLE manifiesto IS ''Manifiesto: documento de liquidacion de un periodo; totales calculados desde despachos.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'guia_master' AND column_name = 'consignatario_version_id') THEN
    EXECUTE 'COMMENT ON COLUMN guia_master.consignatario_version_id IS ''FK a consignatario_version: snapshot inmutable congelado al primer despacho de pieza. NULL = lee del maestro vivo.''';
    EXECUTE 'COMMENT ON COLUMN guia_master.consignatario_congelado_en IS ''Momento en que la guia congelo los datos del consignatario.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'despacho' AND column_name = 'consignatario_version_id') THEN
    EXECUTE 'COMMENT ON COLUMN despacho.consignatario_version_id IS ''Snapshot inmutable del consignatario al momento de crear el despacho. NULL si tipo_entrega no es DOMICILIO.''';
  END IF;
END $$;

-- =====================================================================
-- 8) Notas para el equipo
--
-- Outbox: los OutboxEvent en estado PENDING anteriores a esta migracion
-- contienen "destinatarioFinalId" en payload_json. El nuevo
-- TrackingEventService usa "consignatarioId". El relay actual no parsea
-- el payload (solo loggea), asi que no hay regresion. Si en el futuro
-- se agrega un publisher que consuma el payload, debe tolerar ambos
-- nombres durante una release.
--
-- =====================================================================
