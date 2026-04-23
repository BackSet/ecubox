import 'package:dio/dio.dart';

String messageFromDio(Object error) {
  if (error is DioException) {
    final data = error.response?.data;
    if (data is Map) {
      final m = data['message'];
      if (m != null) return m.toString();
    }
    if (error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout) {
      return 'Tiempo de espera agotado. Revisa tu conexión.';
    }
    if (error.type == DioExceptionType.connectionError) {
      return 'No se pudo conectar al servidor. Comprueba que el backend esté '
          'en marcha, el puerto (p. ej. 8080) y, en un móvil físico, '
          '`--dart-define=API_BASE_URL=http://IP_DE_TU_PC:8080`.';
    }
    if (error.response?.statusCode == 401) {
      return 'Sesión expirada o credenciales inválidas.';
    }
    if (error.response?.statusCode == 403) {
      return 'No tienes permiso para esta acción.';
    }
    return error.message ?? 'Error de red';
  }
  return error.toString();
}
