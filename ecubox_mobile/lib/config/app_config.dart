import 'package:flutter/foundation.dart'
    show defaultTargetPlatform, kIsWeb, TargetPlatform;

/// URL base del API (sin barra final).
///
/// Prioridad:
/// 1. `--dart-define=API_BASE_URL=...` (obligatorio en **dispositivo físico** Android: IP de tu PC).
/// 2. En Android (emulador o APK de prueba): `http://10.0.2.2:8080` (alias del host del PC).
/// 3. En iOS Simulator, escritorio, etc.: `http://127.0.0.1:8080`.
class AppConfig {
  AppConfig._();

  static const String _fromEnv = String.fromEnvironment('API_BASE_URL');

  static String get apiBaseUrl {
    final env = _fromEnv.trim();
    if (env.isNotEmpty) return env;
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:8080';
    }
    return 'http://127.0.0.1:8080';
  }
}
