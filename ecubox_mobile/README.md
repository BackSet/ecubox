# ECUBOX Mobile (cliente)

App Flutter para el **cliente final**: inicio de sesión JWT, **Mis guías**, **Destinatarios** (consignatarios) y formularios alineados con el API de `ecubox-backend`.

## Ejecutar sin perder la conexión (Windows / emulador)

En algunos equipos, `flutter run` con el **DDS** activado corta la sesión con «Lost connection to device» aunque la app siga en el emulador.

- **Terminal:** desde esta carpeta usa `.\run.bat` o `.\run.ps1` (equivale a `flutter run --no-dds`).
- **Cursor / VS Code:** el repositorio incluye `dart.flutterRunAdditionalArgs: ["--no-dds"]` en `.vscode/settings.json` (raíz del repo y `ecubox_mobile/.vscode`). Tras recargar la ventana, **Run / Debug** debería lanzar ya con `--no-dds`.
- **Depuración:** `ecubox_mobile/.vscode/launch.json` define `templateFor: ""` y `toolArgs` con `--no-dds` para alinear el botón de ejecutar con esa opción.

## URL del API

- **Android (emulador):** por defecto la app usa `http://10.0.2.2:8080` (el host donde corre el backend en tu PC). No hace falta `dart-define` si el API escucha en el puerto **8080**.
- **iOS Simulator / escritorio:** por defecto `http://127.0.0.1:8080`.
- **Android o iOS en dispositivo físico:** `10.0.2.2` no sirve; usa la IP local de tu PC, por ejemplo:

```bash
flutter run --dart-define=API_BASE_URL=http://192.168.1.50:8080
```

Para un servidor remoto o HTTPS:

```bash
flutter run --dart-define=API_BASE_URL=https://tu-servidor.com
```

### HTTP en claro (solo desarrollo)

En **builds debug** de Android, `android/app/src/debug/AndroidManifest.xml` activa `usesCleartextTraffic` para poder hablar con el backend por HTTP local. En **release** usa HTTPS o configura red de confianza según la guía de Android.

Ya está declarado el permiso `INTERNET` en el manifiesto principal.

## CORS y Flutter Web

Las apps **Android/iOS** no aplican CORS del navegador. Si compilas para **Web**, el dominio del hosting debe figurar en `cors.allowed-origins` del backend.

## Marca y tema

Colores y tipografía siguen los tokens de `ecubox-frontend/src/index.css` (modo claro y oscuro del sistema).

## Error del IDE: `Unsupported class file major version 69`

Ese número (**69**) corresponde a **Java 25**. Flutter 3.4x incluye un plugin Gradle (`packages/flutter_tools/gradle`) compilado para esa versión; el JVM que usa **Gradle en el IDE** debe ser **25 o superior**. Si Android Studio / Cursor analiza el proyecto con JDK 17 u 21, el import de Gradle falla aunque `flutter build apk` funcione en otra terminal con otro `JAVA_HOME`.

**Qué hacer:** en Android Studio, **Gradle JDK** = JDK 25+ (o alinea `JAVA_HOME` con esa versión al abrir el proyecto). Opcional: fija `org.gradle.java.home` en `android/gradle.properties` (ver comentarios ahí).

`GeneratedPluginRegistrant.java` es **generado** por Flutter; avisos de imports o classpath suelen resolverse al arreglar el JDK de Gradle y ejecutar `flutter pub get`.

## Si aún ves «Lost connection to device»

Comprueba si el proceso sigue vivo: `adb shell pidof com.example.ecubox_mobile`. Si hay PID, el fallo es del **enlace de depuración**, no del cierre de la app. Prueba `adb kill-server`, reinicio del AVD o excluir el proyecto del antivirus.

## Comandos útiles

```bash
flutter pub get
flutter analyze
flutter test
```
