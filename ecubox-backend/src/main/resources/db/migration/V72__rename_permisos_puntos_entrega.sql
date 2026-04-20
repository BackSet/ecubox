-- =====================================================================
-- V72: Renombrar permisos AGENCIAS_DISTRIBUIDOR_* a PUNTOS_ENTREGA_*
--
-- La URL canónica del recurso quedó como /puntos-entrega (Punto de
-- entrega) tras la refactorización de nomenclatura industrial. Este
-- script alinea los códigos de permiso con esa nomenclatura.
--
-- NOTA: la entidad/tabla `agencia_distribuidor` permanece con su nombre
-- por ahora (deuda técnica documentada en docs/nomenclatura.md). Sólo
-- se renombran los permisos visibles a la API/UI.
-- =====================================================================

UPDATE permiso SET codigo = 'PUNTOS_ENTREGA_READ',
                   descripcion = 'Ver listado y detalle de puntos de entrega'
 WHERE codigo = 'AGENCIAS_DISTRIBUIDOR_READ';

UPDATE permiso SET codigo = 'PUNTOS_ENTREGA_WRITE',
                   descripcion = 'Crear, editar y eliminar puntos de entrega'
 WHERE codigo = 'AGENCIAS_DISTRIBUIDOR_WRITE';
