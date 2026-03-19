package com.ecubox.ecubox_backend.config;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Carga variables desde un archivo .env en el directorio de trabajo (user.dir)
 * y las establece como System properties si aún no están definidas (env o system).
 * Así Spring puede resolver ${VAR} en application.properties desde el .env.
 */
public final class EnvLoader {

    private static final String ENV_FILE = ".env";

    private EnvLoader() {
    }

    /**
     * Lee .env desde el directorio de trabajo actual y aplica KEY=VALUE
     * como System.setProperty(key, value) solo cuando la clave no está ya definida.
     * Busca primero en user.dir; si no existe, intenta en user.dir/ecubox-backend
     * para cuando la aplicación se ejecuta desde la raíz del monorepo.
     * No lanza excepciones si el archivo no existe o no se puede leer.
     */
    public static void load() {
        String userDir = System.getProperty("user.dir");
        if (userDir == null || userDir.isBlank()) {
            return;
        }
        Path path = Paths.get(userDir, ENV_FILE);
        if (!Files.isRegularFile(path)) {
            path = Paths.get(userDir, "ecubox-backend", ENV_FILE);
        }
        if (!Files.isRegularFile(path)) {
            return;
        }
        try {
            Files.readAllLines(path).stream()
                    .map(String::trim)
                    .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                    .forEach(EnvLoader::applyLine);
        } catch (IOException ignored) {
            // Fallo silencioso para no romper despliegues sin .env
        }
    }

    private static void applyLine(String line) {
        int eq = line.indexOf('=');
        if (eq <= 0) {
            return;
        }
        String key = line.substring(0, eq).trim();
        String value = line.substring(eq + 1).trim();
        if (key.isEmpty()) {
            return;
        }
        // Quitar comillas dobles del valor si están al inicio y al final
        if (value.length() >= 2 && value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length() - 1);
        }
        // No sobrescribir si ya está definido (env o system)
        if (System.getenv(key) != null || System.getProperty(key) != null) {
            return;
        }
        // No establecer valores vacíos: así Spring usará el default de application-*.properties
        if (value.isBlank()) {
            return;
        }
        System.setProperty(key, value);
    }
}
