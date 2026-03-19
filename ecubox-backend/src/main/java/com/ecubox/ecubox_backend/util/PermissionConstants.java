package com.ecubox.ecubox_backend.util;

/**
 * Constantes de permisos para control de acceso con @PreAuthorize.
 */
public final class PermissionConstants {

    private PermissionConstants() {}

    public static final String USUARIOS_READ = "USUARIOS_READ";
    public static final String USUARIOS_WRITE = "USUARIOS_WRITE";
    public static final String ROLES_READ = "ROLES_READ";
    public static final String ROLES_WRITE = "ROLES_WRITE";
    public static final String PERMISOS_READ = "PERMISOS_READ";
    public static final String AGENCIAS_READ = "AGENCIAS_READ";
    public static final String AGENCIAS_WRITE = "AGENCIAS_WRITE";
    public static final String DISTRIBUIDORES_READ = "DISTRIBUIDORES_READ";
    public static final String DISTRIBUIDORES_WRITE = "DISTRIBUIDORES_WRITE";
    public static final String MANIFIESTOS_READ = "MANIFIESTOS_READ";
    public static final String MANIFIESTOS_WRITE = "MANIFIESTOS_WRITE";
    public static final String TARIFA_CALCULADORA_READ = "TARIFA_CALCULADORA_READ";
    public static final String TARIFA_CALCULADORA_WRITE = "TARIFA_CALCULADORA_WRITE";
    public static final String DESTINATARIOS_READ = "DESTINATARIOS_READ";
    public static final String DESTINATARIOS_CREATE = "DESTINATARIOS_CREATE";
    public static final String DESTINATARIOS_UPDATE = "DESTINATARIOS_UPDATE";
    public static final String DESTINATARIOS_DELETE = "DESTINATARIOS_DELETE";
    public static final String DESTINATARIOS_OPERARIO = "DESTINATARIOS_OPERARIO";
    public static final String PAQUETES_READ = "PAQUETES_READ";
    public static final String PAQUETES_CREATE = "PAQUETES_CREATE";
    public static final String PAQUETES_UPDATE = "PAQUETES_UPDATE";
    public static final String PAQUETES_DELETE = "PAQUETES_DELETE";
}
