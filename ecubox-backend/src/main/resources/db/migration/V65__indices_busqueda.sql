-- V65: Indices para acelerar consultas de uso frecuente.
--
-- 1) idx_despacho_fecha_hora: usado por findByFechaHoraBetween... y por la
--    consulta de candidatos para manifiesto (rango por fechaHora).
-- 2) idx_despacho_manifiesto_null: indice parcial sobre los despachos aun sin
--    manifiesto (los unicos consultados al armar uno nuevo). Reduce el scan
--    cuando ya hay miles de despachos historicos manifestados.
-- 3) idx_destinatario_nombre_trgm: indice GIN trigram para acelerar busquedas
--    LIKE/ILIKE por nombre del destinatario en el panel del operario.

CREATE INDEX IF NOT EXISTS idx_despacho_fecha_hora ON despacho(fecha_hora);

-- Indice parcial: solo entradas donde manifiesto_id IS NULL.
CREATE INDEX IF NOT EXISTS idx_despacho_manifiesto_null
    ON despacho(fecha_hora)
    WHERE manifiesto_id IS NULL;

-- pg_trgm permite indexar busquedas por similitud y LIKE '%texto%'.
-- La extension la creara un superusuario; si no existe la BD ignorara el
-- indice (CREATE EXTENSION es idempotente).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_destinatario_nombre_trgm
    ON destinatario_final
    USING GIN (LOWER(nombre) gin_trgm_ops);
