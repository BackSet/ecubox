CREATE TABLE revision_paquete (
    id BIGSERIAL PRIMARY KEY,
    paquete_id BIGINT NOT NULL REFERENCES paquete(id),
    motivo VARCHAR(40) NOT NULL,
    estado VARCHAR(20) NOT NULL,
    observacion_inicio TEXT,
    fecha_inicio TIMESTAMP NOT NULL,
    iniciado_por_usuario_id BIGINT NOT NULL REFERENCES usuario(id),
    fecha_resolucion TIMESTAMP,
    resuelto_por_usuario_id BIGINT REFERENCES usuario(id),
    observacion_resolucion TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT ck_revision_paquete_motivo CHECK (motivo IN (
        'DATOS_INCONSISTENTES', 'PESO_O_DIMENSIONES', 'CONSIGNATARIO_INCORRECTO',
        'GUIA_INCORRECTA', 'CONTENIDO_RESTRINGIDO', 'OTRO'
    )),
    CONSTRAINT ck_revision_paquete_estado CHECK (estado IN ('EN_REVISION', 'RESUELTA')),
    CONSTRAINT ck_revision_paquete_otro_observacion CHECK (
        motivo <> 'OTRO' OR NULLIF(BTRIM(observacion_inicio), '') IS NOT NULL
    ),
    CONSTRAINT ck_revision_paquete_resolucion CHECK (
        (estado = 'EN_REVISION' AND fecha_resolucion IS NULL AND resuelto_por_usuario_id IS NULL)
        OR
        (estado = 'RESUELTA' AND fecha_resolucion IS NOT NULL AND resuelto_por_usuario_id IS NOT NULL)
    )
);

CREATE INDEX ix_revision_paquete_paquete ON revision_paquete(paquete_id);
CREATE INDEX ix_revision_paquete_estado ON revision_paquete(estado);
CREATE INDEX ix_revision_paquete_fecha_inicio ON revision_paquete(fecha_inicio DESC);
CREATE UNIQUE INDEX uq_revision_paquete_activa
    ON revision_paquete(paquete_id)
    WHERE estado = 'EN_REVISION';

INSERT INTO permiso (codigo, descripcion) VALUES
    ('PAQUETES_REVISION_READ', 'Consultar revisión administrativa e historial de paquetes'),
    ('PAQUETES_REVISION_CREATE', 'Iniciar revisión administrativa de paquetes'),
    ('PAQUETES_REVISION_RESOLVE', 'Resolver revisión administrativa de paquetes')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
CROSS JOIN permiso p
WHERE r.nombre IN ('ADMIN', 'OPERARIO')
  AND p.codigo IN (
      'PAQUETES_REVISION_READ',
      'PAQUETES_REVISION_CREATE',
      'PAQUETES_REVISION_RESOLVE'
  )
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
