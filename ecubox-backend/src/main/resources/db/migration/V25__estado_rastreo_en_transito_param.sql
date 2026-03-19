-- Estado en tránsito: se aplica cuando el operario usa "Aplicar estado por periodo" en despachos (valor = id estado_rastreo, por defecto 5 = EN_TRANSITO)
INSERT INTO parametro_sistema (clave, valor) VALUES
    ('estado_rastreo_en_transito', '5')
ON CONFLICT (clave) DO NOTHING;
