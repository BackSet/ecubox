-- Amplia la configuración de estados por punto para cubrir acciones de
-- paquetes, guías master, consolidados y tracking.
--
-- Los puntos de paquetes usan IDs del catálogo estado_rastreo.
-- Los puntos de guías master usan valores del enum EstadoGuiaMaster.
-- Los puntos de consolidados usan el estado operativo derivado de fecha_cerrado.

INSERT INTO parametro_sistema (clave, valor) VALUES
    ('estado_rastreo_enviado_desde_usa', ''),
    ('estado_rastreo_arribado_ec', ''),
    ('estado_guia_master_sin_piezas', 'SIN_PIEZAS_REGISTRADAS'),
    ('estado_guia_master_en_espera_recepcion', 'EN_ESPERA_RECEPCION'),
    ('estado_guia_master_recepcion_parcial', 'RECEPCION_PARCIAL'),
    ('estado_guia_master_recepcion_completa', 'RECEPCION_COMPLETA'),
    ('estado_guia_master_despacho_parcial', 'DESPACHO_PARCIAL'),
    ('estado_guia_master_despacho_completado', 'DESPACHO_COMPLETADO'),
    ('estado_guia_master_despacho_incompleto', 'DESPACHO_INCOMPLETO'),
    ('estado_guia_master_cancelada', 'CANCELADA'),
    ('estado_guia_master_en_revision', 'EN_REVISION'),
    ('estado_consolidado_creado', 'ABIERTO'),
    ('estado_consolidado_agregado_lote', 'CERRADO'),
    ('estado_consolidado_cerrado', 'CERRADO'),
    ('estado_consolidado_reabierto', 'ABIERTO')
ON CONFLICT (clave) DO NOTHING;
