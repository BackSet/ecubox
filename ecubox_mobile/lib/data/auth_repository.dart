import 'package:dio/dio.dart';

import '../models/login_response.dart';

class AuthRepository {
  AuthRepository(this._dio);

  final Dio _dio;

  Future<LoginResponse> login(String username, String password) async {
    final res = await _dio.post<Map<String, dynamic>>(
      '/api/auth/login',
      data: {'username': username, 'password': password},
    );
    return LoginResponse.fromJson(res.data!);
  }

  Future<LoginResponse> me() async {
    final res = await _dio.get<Map<String, dynamic>>('/api/auth/me');
    return LoginResponse.fromJson(res.data!);
  }
}
