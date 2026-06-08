-- Permisos faltantes para que el dashboard y los endpoints autenticados no
-- dependan de roles directos ni de permisos genéricos de otros módulos.

INSERT INTO permiso (codigo, descripcion)
VALUES
    ('INICIO_READ', 'Ver el panel de inicio del dashboard'),
    ('CASILLERO_READ', 'Ver información del casillero del usuario'),
    ('PERFIL_READ', 'Ver el perfil propio'),
    ('PERFIL_UPDATE', 'Actualizar el perfil propio'),
    ('PARAMETROS_SISTEMA_READ', 'Acceder a parámetros del sistema'),
    ('MENSAJE_WHATSAPP_DESPACHO_READ', 'Ver plantilla de WhatsApp para despachos'),
    ('MENSAJE_WHATSAPP_DESPACHO_WRITE', 'Editar plantilla de WhatsApp para despachos'),
    ('MENSAJE_AGENCIA_EEUU_READ', 'Ver información del casillero en Estados Unidos'),
    ('MENSAJE_AGENCIA_EEUU_WRITE', 'Editar información del casillero en Estados Unidos'),
    ('CANALES_COMUNICACION_READ', 'Ver canales de comunicación configurados'),
    ('CANALES_COMUNICACION_WRITE', 'Editar canales de comunicación públicos'),
    ('TEMA_TEMPORADA_READ', 'Ver configuración del tema de temporada'),
    ('CONFIG_TARIFA_DISTRIBUCION_READ', 'Ver configuración de tarifa de distribución'),
    ('LOTES_RECEPCION_READ', 'Ver lotes de recepción'),
    ('LOTES_RECEPCION_CREATE', 'Crear y agregar guías a lotes de recepción'),
    ('LOTES_RECEPCION_DELETE', 'Eliminar lotes de recepción'),
    ('PAQUETES_OPERARIO', 'Gestionar paquetes de todos los clientes'),
    ('TRACKING_PROJECTOR_HEALTH_READ', 'Ver salud del proyector de tracking')
ON CONFLICT (codigo) DO UPDATE
SET descripcion = EXCLUDED.descripcion;

-- Roles internos: operación completa sobre los módulos operativos y de configuración.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN (
    'INICIO_READ',
    'CASILLERO_READ',
    'PERFIL_READ',
    'PERFIL_UPDATE',
    'PARAMETROS_SISTEMA_READ',
    'MENSAJE_WHATSAPP_DESPACHO_READ',
    'MENSAJE_WHATSAPP_DESPACHO_WRITE',
    'MENSAJE_AGENCIA_EEUU_READ',
    'MENSAJE_AGENCIA_EEUU_WRITE',
    'CANALES_COMUNICACION_READ',
    'CANALES_COMUNICACION_WRITE',
    'TEMA_TEMPORADA_READ',
    'TEMA_TEMPORADA_WRITE',
    'CONFIG_TARIFA_DISTRIBUCION_READ',
    'CONFIG_TARIFA_DISTRIBUCION_WRITE',
    'LOTES_RECEPCION_READ',
    'LOTES_RECEPCION_CREATE',
    'LOTES_RECEPCION_DELETE',
    'PAQUETES_OPERARIO',
    'TRACKING_PROJECTOR_HEALTH_READ'
)
WHERE r.nombre IN ('ADMIN', 'OPERARIO')
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- Clientes autenticados: solo su panel, casillero y perfil.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN (
    'INICIO_READ',
    'CASILLERO_READ',
    'PERFIL_READ',
    'PERFIL_UPDATE'
)
WHERE r.nombre = 'CLIENTE'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;

-- USER histórico: mantener navegación básica si existe en instalaciones antiguas.
INSERT INTO rol_permiso (rol_id, permiso_id)
SELECT r.id, p.id
FROM rol r
JOIN permiso p ON p.codigo IN (
    'INICIO_READ',
    'CASILLERO_READ',
    'PERFIL_READ',
    'PERFIL_UPDATE'
)
WHERE r.nombre = 'USER'
ON CONFLICT (rol_id, permiso_id) DO NOTHING;
