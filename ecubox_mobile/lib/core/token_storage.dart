import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const _kToken = 'ecubox_jwt';

class TokenStorage {
  TokenStorage({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  Future<String?> readToken() => _storage.read(key: _kToken);

  Future<void> writeToken(String token) =>
      _storage.write(key: _kToken, value: token);

  Future<void> clearToken() => _storage.delete(key: _kToken);
}
