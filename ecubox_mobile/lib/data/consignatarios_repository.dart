import 'package:dio/dio.dart';

import '../models/consignatario.dart';

class ConsignatariosRepository {
  ConsignatariosRepository(this._dio);

  final Dio _dio;

  Future<List<Consignatario>> listar() async {
    final res = await _dio.get<List<dynamic>>('/api/mis-consignatarios');
    return (res.data ?? [])
        .map((e) => Consignatario.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<Consignatario> crear(Consignatario body) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/mis-consignatarios',
      data: body.toCreateJson(),
    );
    return Consignatario.fromJson(res.data!);
  }
}
