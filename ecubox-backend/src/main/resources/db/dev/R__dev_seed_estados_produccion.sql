-- DEV ONLY: deja el catálogo de estados de rastreo EXACTAMENTE igual al de PRODUCCIÓN.
--
-- Esta carpeta (classpath:db/dev) solo se incluye en spring.flyway.locations del
-- perfil dev (ver application-dev.properties), así que NUNCA corre en prod.
--
-- Es una migración REPETIBLE (prefijo R__): se re-aplica cuando cambia su checksum
-- y es idempotente, por lo que converge cualquier base local al set de producción
-- sin importar su estado previo. No "quema" estados en el código de la app: esto es
-- solo data de catálogo, configurable luego desde Parámetros.
--
-- A diferencia de un seed conservador, aquí los estados heredados que NO son de
-- producción se ELIMINAN (no solo se desactivan). Por eso primero se limpian sus
-- referencias en paquete y paquete_estado_evento (datos de dev).

-- Lista canónica de códigos de producción (mantener sincronizada en todo el archivo).

-- 1. Liberar la ventana del índice único uk_estado_rastreo_orden_tracking_activo
--    moviendo los orden_tracking actuales a valores negativos únicos.
UPDATE estado_rastreo SET orden_tracking = -id, orden = -id;

-- 2. Upsert (por codigo) de los estados de producción. Los 9 NORMAL quedan 1..9 y
--    el ALTERNO RETENIDO_ADUANA aparte (10), anclado "después de" LLEGA_A_ADUANA.
INSERT INTO estado_rastreo (codigo, nombre, orden, orden_tracking, tipo_flujo, publico_tracking, activo)
VALUES
    ('REGISTRADO',      'Registrado EE.UU',         1,  1,  'NORMAL',  TRUE, TRUE),
    ('PLANILLA',        'En planilla',              2,  2,  'NORMAL',  TRUE, TRUE),
    ('MANIFESTADO',     'Manifestado',              3,  3,  'NORMAL',  TRUE, TRUE),
    ('VUELO',           'En vuelo a Ecuador',       4,  4,  'NORMAL',  TRUE, TRUE),
    ('LLEGA_A_ADUANA',  'Llega a aduana destino',   5,  5,  'NORMAL',  TRUE, TRUE),
    ('EN_BODEGA',       'Llega a bodega Quito',      6,  6,  'NORMAL',  TRUE, TRUE),
    ('TRABAJO',         'Preparando envío',         7,  7,  'NORMAL',  TRUE, TRUE),
    ('EN_TRANSITO',     'En tránsito a destino',    8,  8,  'NORMAL',  TRUE, TRUE),
    ('ENTREGADO',       'Entregado a destinatario', 9,  9,  'NORMAL',  TRUE, TRUE),
    ('RETENIDO_ADUANA', 'Retenido en aduana',       10, 10, 'ALTERNO', TRUE, TRUE)
ON CONFLICT (codigo) DO UPDATE SET
    nombre = EXCLUDED.nombre,
    orden = EXCLUDED.orden,
    orden_tracking = EXCLUDED.orden_tracking,
    tipo_flujo = EXCLUDED.tipo_flujo,
    publico_tracking = EXCLUDED.publico_tracking,
    activo = TRUE,
    after_estado_id = NULL;

-- 3. El alterno RETENIDO_ADUANA se ubica "después de" LLEGA_A_ADUANA.
UPDATE estado_rastreo
SET after_estado_id = (SELECT id FROM estado_rastreo WHERE codigo = 'LLEGA_A_ADUANA')
WHERE codigo = 'RETENIDO_ADUANA';

-- 4. Repointar paquetes que apunten a estados que no son de producción.
UPDATE paquete
SET estado_rastreo_id = (SELECT id FROM estado_rastreo WHERE codigo = 'REGISTRADO')
WHERE estado_rastreo_id IN (
    SELECT id FROM estado_rastreo
    WHERE codigo NOT IN (
        'REGISTRADO','PLANILLA','MANIFESTADO','VUELO','LLEGA_A_ADUANA',
        'EN_BODEGA','TRABAJO','EN_TRANSITO','ENTREGADO','RETENIDO_ADUANA'
    )
);

-- 5. Borrar eventos históricos (dev) que referencien estados no productivos.
DELETE FROM paquete_estado_evento
WHERE estado_destino_id IN (
        SELECT id FROM estado_rastreo WHERE codigo NOT IN (
            'REGISTRADO','PLANILLA','MANIFESTADO','VUELO','LLEGA_A_ADUANA',
            'EN_BODEGA','TRABAJO','EN_TRANSITO','ENTREGADO','RETENIDO_ADUANA'))
   OR estado_origen_id IN (
        SELECT id FROM estado_rastreo WHERE codigo NOT IN (
            'REGISTRADO','PLANILLA','MANIFESTADO','VUELO','LLEGA_A_ADUANA',
            'EN_BODEGA','TRABAJO','EN_TRANSITO','ENTREGADO','RETENIDO_ADUANA'));

-- 6. Romper auto-referencias after_estado_id que apunten a estados no productivos.
UPDATE estado_rastreo SET after_estado_id = NULL
WHERE after_estado_id IN (
    SELECT id FROM estado_rastreo WHERE codigo NOT IN (
        'REGISTRADO','PLANILLA','MANIFESTADO','VUELO','LLEGA_A_ADUANA',
        'EN_BODEGA','TRABAJO','EN_TRANSITO','ENTREGADO','RETENIDO_ADUANA'));

-- 7. Eliminar definitivamente los estados heredados que no son de producción.
DELETE FROM estado_rastreo
WHERE codigo NOT IN (
    'REGISTRADO','PLANILLA','MANIFESTADO','VUELO','LLEGA_A_ADUANA',
    'EN_BODEGA','TRABAJO','EN_TRANSITO','ENTREGADO','RETENIDO_ADUANA'
);

-- 8. Apuntar los "estados por punto" (parámetros) a estados de producción
--    coherentes. Son defaults de dev; se pueden reconfigurar en Parámetros.
INSERT INTO parametro_sistema (clave, valor) VALUES
    ('estado_rastreo_registro_paquete',   (SELECT id::text FROM estado_rastreo WHERE codigo = 'REGISTRADO')),
    ('estado_rastreo_en_lote_recepcion',  (SELECT id::text FROM estado_rastreo WHERE codigo = 'EN_BODEGA')),
    ('estado_rastreo_asociar_guia_master',(SELECT id::text FROM estado_rastreo WHERE codigo = 'MANIFESTADO')),
    ('estado_rastreo_en_despacho',        (SELECT id::text FROM estado_rastreo WHERE codigo = 'TRABAJO')),
    ('estado_rastreo_en_transito',        (SELECT id::text FROM estado_rastreo WHERE codigo = 'EN_TRANSITO')),
    ('estado_rastreo_enviado_desde_usa',  (SELECT id::text FROM estado_rastreo WHERE codigo = 'VUELO')),
    ('estado_rastreo_arribado_ec',        (SELECT id::text FROM estado_rastreo WHERE codigo = 'LLEGA_A_ADUANA')),
    ('estado_rastreo_inicio_cuenta_regresiva', (SELECT id::text FROM estado_rastreo WHERE codigo = 'EN_BODEGA')),
    ('estado_rastreo_fin_cuenta_regresiva',    (SELECT id::text FROM estado_rastreo WHERE codigo = 'ENTREGADO')),
    ('estado_rastreo_entrega_confirmada_cliente', (SELECT id::text FROM estado_rastreo WHERE codigo = 'ENTREGADO')),
    ('estado_rastreo_aviso_confirmacion_entrega', (SELECT id::text FROM estado_rastreo WHERE codigo = 'EN_TRANSITO'))
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor;
