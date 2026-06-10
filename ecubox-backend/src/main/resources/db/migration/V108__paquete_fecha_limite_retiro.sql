-- Persistir la fecha limite de retiro del paquete para poder derivar el estado
-- "vencido" como predicado SQL (fecha_limite_retiro < now()) en lugar de
-- calcularlo en Java por fila. Esto habilita conteos, filtros y un endpoint de
-- resumen liviano sin descargar el dataset completo al cliente.
--
-- La columna es nullable: es NULL cuando el paquete ya esta entregado (estado de
-- fin de cuenta regresiva) o cuando aun no hay fecha ancla / dias maximos de
-- retiro resueltos. "vencido" := fecha_limite_retiro IS NOT NULL AND
-- fecha_limite_retiro < now().
--
-- El backfill de los paquetes existentes NO es SQL puro (la fecha ancla se
-- deriva del historial de estados en paquete_estado_evento), por lo que se
-- ejecuta de forma idempotente desde la aplicacion (PaqueteVencimientoBackfill).

ALTER TABLE paquete ADD COLUMN IF NOT EXISTS fecha_limite_retiro timestamp NULL;

-- Indice parcial: solo indexamos las filas con plazo activo, que son las que se
-- consultan al filtrar/contar vencidos.
CREATE INDEX IF NOT EXISTS idx_paquete_fecha_limite_retiro
    ON paquete (fecha_limite_retiro)
    WHERE fecha_limite_retiro IS NOT NULL;
