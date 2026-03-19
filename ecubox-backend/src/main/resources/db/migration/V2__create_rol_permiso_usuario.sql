-- Usuarios, roles y permisos (modelo N:M)
CREATE TABLE permiso (
    id BIGSERIAL PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL UNIQUE,
    descripcion VARCHAR(255)
);

CREATE TABLE rol (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE rol_permiso (
    rol_id BIGINT NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
    permiso_id BIGINT NOT NULL REFERENCES permiso(id) ON DELETE CASCADE,
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE usuario (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE usuario_rol (
    usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    rol_id BIGINT NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, rol_id)
);

-- Roles iniciales
INSERT INTO rol (nombre) VALUES ('ADMIN'), ('USER');

-- Permisos iniciales
INSERT INTO permiso (codigo, descripcion) VALUES
    ('USUARIOS_READ', 'Ver listado y detalle de usuarios'),
    ('USUARIOS_WRITE', 'Crear, editar y desactivar usuarios'),
    ('ROLES_READ', 'Ver listado y detalle de roles'),
    ('ROLES_WRITE', 'Asignar permisos a roles'),
    ('PERMISOS_READ', 'Ver listado de permisos');

-- ADMIN tiene todos los permisos
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id FROM rol r CROSS JOIN permiso p WHERE r.nombre = 'ADMIN';

COMMENT ON TABLE permiso IS 'Permisos granulares del sistema';
COMMENT ON TABLE rol IS 'Roles de usuario';
COMMENT ON TABLE usuario IS 'Usuarios del sistema (autenticación)';
