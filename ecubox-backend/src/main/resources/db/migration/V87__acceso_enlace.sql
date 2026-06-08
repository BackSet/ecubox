-- Módulo de enlaces de acceso sin registro.
--
-- Un enlace da acceso de SOLO LECTURA a los paquetes/guías de un CONJUNTO de
-- consignatarios (no a la cuenta de un usuario). Así un operador/administrador
-- que registra guías de clientes que no usan el sistema puede compartir un
-- enlace acotado a esos consignatarios, sin exponer su propia cuenta ni el panel.
--
-- Solo se guarda el hash del token; el valor en claro se entrega una sola vez.
CREATE TABLE acceso_enlace (
    id BIGSERIAL PRIMARY KEY,
    token_hash VARCHAR(64) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    etiqueta VARCHAR(120),
    expira_at TIMESTAMP,
    revocado_at TIMESTAMP,
    creado_por_usuario_id BIGINT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acceso_at TIMESTAMP,
    CONSTRAINT fk_acceso_enlace_creado_por
        FOREIGN KEY (creado_por_usuario_id) REFERENCES usuario(id) ON DELETE SET NULL,
    CONSTRAINT uq_acceso_enlace_hash UNIQUE (token_hash),
    CONSTRAINT chk_acceso_enlace_tipo CHECK (tipo IN ('PERSISTENTE', 'TEMPORAL'))
);

CREATE INDEX idx_acceso_enlace_revocado ON acceso_enlace (revocado_at);

-- Consignatarios cubiertos por cada enlace (relación N:M).
CREATE TABLE acceso_enlace_consignatario (
    acceso_enlace_id BIGINT NOT NULL,
    consignatario_id BIGINT NOT NULL,
    PRIMARY KEY (acceso_enlace_id, consignatario_id),
    CONSTRAINT fk_aec_enlace
        FOREIGN KEY (acceso_enlace_id) REFERENCES acceso_enlace(id) ON DELETE CASCADE,
    CONSTRAINT fk_aec_consignatario
        FOREIGN KEY (consignatario_id) REFERENCES consignatario(id) ON DELETE CASCADE
);

CREATE INDEX idx_aec_consignatario ON acceso_enlace_consignatario (consignatario_id);

-- Permiso de gestión del módulo (generar/listar/revocar enlaces).
INSERT INTO permiso (codigo, descripcion)
VALUES (
    'ACCESO_ENLACES_MANAGE',
    'Generar y administrar enlaces de acceso de solo lectura para consignatarios'
)
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo = 'ACCESO_ENLACES_MANAGE'
WHERE r.nombre IN ('ADMIN', 'OPERARIO')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
