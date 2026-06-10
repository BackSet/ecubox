-- Corrige el sesgo de zona horaria en fecha_limite_retiro.
--
-- Hasta V108 las marcas de tiempo ancla (paquete.fecha_estado_actual_desde y
-- paquete_estado_evento.occurred_at) se escribian con LocalDateTime.now() sin
-- zona, es decir en la zona por defecto de la JVM (UTC en el contenedor). El
-- calculo de la fecha limite las reinterpreta en America/Guayaquil
-- (computeFechaLimiteRetiro -> atZone(ZONA_ECUADOR).toLocalDate()), por lo que
-- los paquetes cuya transicion ancla cae entre 00:00 y 05:00 UTC (19:00-24:00 de
-- Ecuador) quedaban con la fecha ancla un dia adelantada y, por tanto, el plazo
-- de retiro corrido un dia.
--
-- El fix de codigo (now(ZONA_ECUADOR) + TZ del contenedor) corrige los calculos
-- futuros, pero las filas ya pobladas conservan el valor sesgado y el backfill
-- de arranque solo procesa filas en NULL. Aqui las vaciamos para que
-- PaqueteVencimientoBackfillRunner las recalcule en el siguiente arranque, ya con
-- la zona horaria correcta. La operacion es idempotente: las filas sin plazo
-- activo vuelven a quedar en NULL y las demas se repueblan con el valor correcto.

UPDATE paquete
   SET fecha_limite_retiro = NULL
 WHERE fecha_limite_retiro IS NOT NULL;
