-- Normaliza "Parametros -> Estados por punto del flujo" con la configuracion
-- operativa actual. Los puntos de paquetes guardan IDs de estado_rastreo; los
-- puntos de guias master y consolidados guardan codigos de enum.

WITH mapping(clave, codigo_estado) AS (
    VALUES
        ('estado_rastreo_registro_paquete', 'REGISTRADO'),
        ('estado_rastreo_en_lote_recepcion', 'EN_BODEGA'),
        ('estado_rastreo_asociar_guia_master', 'MANIFESTADO'),
        ('estado_rastreo_en_despacho', 'TRABAJO'),
        ('estado_rastreo_en_transito', 'EN_TRANSITO'),
        ('estado_rastreo_enviado_desde_usa', 'VUELO'),
        ('estado_rastreo_arribado_ec', 'LLEGA_A_ADUANA'),
        ('estado_rastreo_inicio_cuenta_regresiva', 'EN_BODEGA'),
        ('estado_rastreo_fin_cuenta_regresiva', 'ENTREGADO'),
        ('estado_rastreo_entrega_confirmada_cliente', 'ENTREGADO'),
        ('estado_rastreo_aviso_confirmacion_entrega', 'EN_TRANSITO')
),
resolved AS (
    SELECT m.clave, er.id::TEXT AS valor
    FROM mapping m
    JOIN estado_rastreo er ON er.codigo = m.codigo_estado
    WHERE er.activo IS TRUE
)
INSERT INTO parametro_sistema (clave, valor)
SELECT clave, valor FROM resolved
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;

INSERT INTO parametro_sistema (clave, valor) VALUES
    ('estado_guia_master_sin_piezas', 'SIN_PIEZAS_REGISTRADAS'),
    ('estado_guia_master_en_espera_recepcion', 'EN_ESPERA_RECEPCION'),
    ('estado_guia_master_en_transito_usa_ecuador', 'EN_TRANSITO_USA_ECUADOR'),
    ('estado_guia_master_recepcion_parcial', 'RECEPCION_PARCIAL'),
    ('estado_guia_master_recepcion_completa', 'RECEPCION_COMPLETA'),
    ('estado_guia_master_despacho_parcial', 'DESPACHO_PARCIAL'),
    ('estado_guia_master_despacho_completado', 'DESPACHO_COMPLETADO'),
    ('estado_guia_master_despacho_incompleto', 'DESPACHO_INCOMPLETO'),
    ('estado_guia_master_cancelada', 'CANCELADA'),
    ('estado_guia_master_en_revision', 'EN_REVISION'),
    ('estado_consolidado_creado', 'VACIO'),
    ('estado_consolidado_agregado_lote', 'RECIBIDO_EN_BODEGA'),
    ('estado_consolidado_cerrado', 'ENVIADO_DESDE_USA'),
    ('estado_consolidado_reabierto', 'EN_PREPARACION')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
