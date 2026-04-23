import 'package:dio/dio.dart';

import '../models/guia_master.dart';
import '../models/mi_inicio_dashboard.dart';
import '../models/paquete.dart';

class MisGuiasRepository {
  MisGuiasRepository(this._dio);

  final Dio _dio;

  Future<List<GuiaMaster>> listar() async {
    final res = await _dio.get<List<dynamic>>('/api/mis-guias');
    return (res.data ?? [])
        .map((e) => GuiaMaster.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<MiInicioDashboard> dashboard() async {
    final res = await _dio.get<Map<String, dynamic>>('/api/mis-guias/dashboard');
    return MiInicioDashboard.fromJson(res.data!);
  }

  Future<GuiaMaster> obtener(int id) async {
    final res = await _dio.get<Map<String, dynamic>>('/api/mis-guias/$id');
    return GuiaMaster.fromJson(res.data!);
  }

  Future<List<Paquete>> piezas(int id) async {
    final res = await _dio.get<List<dynamic>>('/api/mis-guias/$id/piezas');
    return (res.data ?? [])
        .map((e) => Paquete.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<GuiaMaster> registrar({
    required String trackingBase,
    required int consignatarioId,
  }) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/mis-guias',
      data: {
        'trackingBase': trackingBase,
        'consignatarioId': consignatarioId,
      },
    );
    return GuiaMaster.fromJson(res.data!);
  }

  Future<GuiaMaster> actualizar({
    required int id,
    String? trackingBase,
    required int consignatarioId,
  }) async {
    final body = <String, dynamic>{'consignatarioId': consignatarioId};
    if (trackingBase != null && trackingBase.isNotEmpty) {
      body['trackingBase'] = trackingBase;
    }
    final res = await _dio.put<Map<String, dynamic>>(
      '/api/mis-guias/$id',
      data: body,
    );
    return GuiaMaster.fromJson(res.data!);
  }

  Future<void> eliminar(int id) async {
    await _dio.delete<void>('/api/mis-guias/$id');
  }
}
