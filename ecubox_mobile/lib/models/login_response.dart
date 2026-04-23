class LoginResponse {
  const LoginResponse({
    required this.token,
    required this.username,
    this.email,
    this.createdAt,
    this.roles = const [],
    this.permissions = const [],
  });

  final String token;
  final String username;
  final String? email;
  final String? createdAt;
  final List<String> roles;
  final List<String> permissions;

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final token = json['token'];
    return LoginResponse(
      token: token is String ? token : '',
      username: (json['username'] as String?) ?? '',
      email: json['email'] as String?,
      createdAt: _jsonStringOrNull(json['createdAt']),
      roles: (json['roles'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
      permissions:
          (json['permissions'] as List<dynamic>?)?.map((e) => e.toString()).toList() ?? [],
    );
  }

  static String? _jsonStringOrNull(Object? value) {
    if (value == null) return null;
    if (value is String) return value;
    return value.toString();
  }
}
