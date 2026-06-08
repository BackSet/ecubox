-- Guarda el token en claro para que el administrador/operario pueda volver a
-- copiar el enlace después de crearlo. Se mantiene token_hash como índice
-- único de búsqueda en el canje. Es un enlace de solo lectura (similar a un
-- enlace de rastreo), por lo que conservar el token es aceptable.
ALTER TABLE acceso_enlace ADD COLUMN token VARCHAR(64);
