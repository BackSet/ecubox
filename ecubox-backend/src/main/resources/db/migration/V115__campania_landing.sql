-- Módulo de campañas configurables para la landing (contenido destacado).
-- Una sola campaña PUBLICADA a la vez (índice único parcial). Auditoría y
-- versionado para control de concurrencia optimista.

CREATE TABLE campania_landing (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre_interno VARCHAR(120) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'BORRADOR',
    tipo VARCHAR(20) NOT NULL,
    etiqueta VARCHAR(40),
    titulo VARCHAR(160),
    descripcion VARCHAR(500),
    texto_cta VARCHAR(60),
    url_cta VARCHAR(500),
    tipo_destino_cta VARCHAR(20),
    imagen_url VARCHAR(500),
    texto_alternativo_imagen VARCHAR(200),
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP,
    publicada_at TIMESTAMP,
    publicada_por BIGINT REFERENCES usuario(id),
    creada_at TIMESTAMP NOT NULL,
    creada_por BIGINT REFERENCES usuario(id),
    actualizada_at TIMESTAMP NOT NULL,
    actualizada_por BIGINT REFERENCES usuario(id),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_campania_landing_estado CHECK (estado IN ('BORRADOR', 'PUBLICADA', 'INACTIVA')),
    CONSTRAINT ck_campania_landing_tipo CHECK (tipo IN ('OFERTA', 'INFORMACION', 'NOVEDAD', 'AVISO')),
    CONSTRAINT ck_campania_landing_tipo_destino CHECK (
        tipo_destino_cta IS NULL OR tipo_destino_cta IN ('INTERNO', 'EXTERNO')
    ),
    -- Fechas coherentes: si ambas existen, fin debe ser posterior a inicio.
    CONSTRAINT ck_campania_landing_fechas CHECK (
        fecha_inicio IS NULL OR fecha_fin IS NULL OR fecha_fin > fecha_inicio
    ),
    -- CTA todo-o-nada: texto, URL y tipo de destino van juntos o ausentes.
    CONSTRAINT ck_campania_landing_cta CHECK (
        (texto_cta IS NULL AND url_cta IS NULL AND tipo_destino_cta IS NULL)
        OR
        (NULLIF(BTRIM(texto_cta), '') IS NOT NULL
            AND NULLIF(BTRIM(url_cta), '') IS NOT NULL
            AND tipo_destino_cta IS NOT NULL)
    ),
    -- Texto alternativo obligatorio cuando hay imagen.
    CONSTRAINT ck_campania_landing_alt CHECK (
        imagen_url IS NULL OR NULLIF(BTRIM(texto_alternativo_imagen), '') IS NOT NULL
    )
);

CREATE INDEX ix_campania_landing_estado ON campania_landing(estado);
CREATE INDEX ix_campania_landing_actualizada ON campania_landing(actualizada_at DESC);

-- Solo una campaña PUBLICADA a la vez: índice único parcial sobre la columna
-- estado restringido a 'PUBLICADA' (que es constante para las filas que matchea).
CREATE UNIQUE INDEX uq_campania_landing_publicada
    ON campania_landing(estado)
    WHERE estado = 'PUBLICADA';

INSERT INTO permiso (codigo, descripcion) VALUES
    ('CONTENIDO_DESTACADO_LANDING_READ', 'Consultar campañas de contenido destacado de la landing'),
    ('CONTENIDO_DESTACADO_LANDING_WRITE', 'Crear y editar campañas de contenido destacado de la landing'),
    ('CONTENIDO_DESTACADO_LANDING_PUBLISH', 'Publicar o desactivar campañas de contenido destacado de la landing')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
CROSS JOIN permiso p
WHERE r.nombre = 'ADMIN'
  AND p.codigo IN (
      'CONTENIDO_DESTACADO_LANDING_READ',
      'CONTENIDO_DESTACADO_LANDING_WRITE',
      'CONTENIDO_DESTACADO_LANDING_PUBLISH'
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
