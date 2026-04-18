-- V64: Optimistic locking
-- Anade columna `version` BIGINT NOT NULL DEFAULT 0 a las entidades con
-- mayor riesgo de mutacion concurrente. Spring/Hibernate gestiona el campo
-- automaticamente vía la anotacion @Version (entidades Despacho, Paquete,
-- Saca, GuiaMaster, EnvioConsolidado, Manifiesto, DestinatarioFinal).
--
-- Estrategia: NOT NULL DEFAULT 0 para que las filas existentes empiecen
-- en version=0. Hibernate incrementara en cada update; si dos transacciones
-- intentan modificar la misma fila se levanta OptimisticLockException -> HTTP 409
-- (ver com.ecubox.ecubox_backend.exception.GlobalExceptionHandler).
--
-- Nota: PostgreSQL maneja DEFAULT en ALTER TABLE rapido para columnas no nullables
-- desde la version 11 (sin reescribir la tabla).

ALTER TABLE despacho             ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE paquete              ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE saca                 ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE guia_master          ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE envio_consolidado    ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE manifiesto           ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
ALTER TABLE destinatario_final   ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
