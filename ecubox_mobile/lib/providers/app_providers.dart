import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';
import '../core/token_storage.dart';
import '../data/auth_repository.dart';
import '../data/consignatarios_repository.dart';
import '../data/mis_guias_repository.dart';
import '../models/consignatario.dart';
import '../models/guia_master.dart';
import '../models/login_response.dart';
import '../models/mi_inicio_dashboard.dart';
import '../models/paquete.dart';

// —— Token ——————————————————————————————————————————————————

final tokenStorageProvider = Provider<TokenStorage>((ref) => TokenStorage());

// —— Auth state ——————————————————————————————————————————————

class AuthState {
  const AuthState({
    required this.bootstrapped,
    this.user,
  });

  final bool bootstrapped;
  final LoginResponse? user;

  bool get isAuthenticated => user != null;

  static const initial = AuthState(bootstrapped: false, user: null);
}

class AuthController extends StateNotifier<AuthState> {
  AuthController(this._ref) : super(AuthState.initial) {
    Future.microtask(_bootstrap);
  }

  final Ref _ref;

  Future<void> _bootstrap() async {
    final token = await _ref.read(tokenStorageProvider).readToken();
    if (token == null || token.isEmpty) {
      state = const AuthState(bootstrapped: true, user: null);
      return;
    }
    try {
      final me = await _ref.read(authRepositoryProvider).me();
      state = AuthState(bootstrapped: true, user: me);
    } catch (_) {
      await _ref.read(tokenStorageProvider).clearToken();
      state = const AuthState(bootstrapped: true, user: null);
    }
  }

  void signOutLocal() {
    state = const AuthState(bootstrapped: true, user: null);
  }

  Future<void> logout() async {
    await _ref.read(tokenStorageProvider).clearToken();
    state = const AuthState(bootstrapped: true, user: null);
  }

  Future<void> login(String username, String password) async {
    final res = await _ref.read(authRepositoryProvider).login(username, password);
    await _ref.read(tokenStorageProvider).writeToken(res.token);
    try {
      final me = await _ref.read(authRepositoryProvider).me();
      state = AuthState(
        bootstrapped: true,
        user: LoginResponse(
          token: res.token,
          username: me.username,
          email: me.email,
          createdAt: me.createdAt,
          roles: me.roles,
          permissions: me.permissions,
        ),
      );
    } catch (_) {
      await _ref.read(tokenStorageProvider).clearToken();
      state = const AuthState(bootstrapped: true, user: null);
      rethrow;
    }
  }
}

final authControllerProvider =
    StateNotifierProvider<AuthController, AuthState>((ref) {
  return AuthController(ref);
});

// —— Dio (después de authController para que exista el notifier) ——

final dioProvider = Provider<Dio>((ref) {
  final dio = Dio(
    BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 20),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ),
  );
  dio.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await ref.read(tokenStorageProvider).readToken();
        if (token != null && token.isNotEmpty) {
          options.headers['Authorization'] = 'Bearer $token';
        }
        return handler.next(options);
      },
      onError: (e, handler) async {
        if (e.response?.statusCode == 401) {
          await ref.read(tokenStorageProvider).clearToken();
          ref.read(authControllerProvider.notifier).signOutLocal();
        }
        return handler.next(e);
      },
    ),
  );
  return dio;
});

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(dioProvider)),
);

final misGuiasRepositoryProvider = Provider<MisGuiasRepository>(
  (ref) => MisGuiasRepository(ref.watch(dioProvider)),
);

final consignatariosRepositoryProvider = Provider<ConsignatariosRepository>(
  (ref) => ConsignatariosRepository(ref.watch(dioProvider)),
);

final misGuiasListProvider =
    FutureProvider.autoDispose<List<GuiaMaster>>((ref) async {
  return ref.watch(misGuiasRepositoryProvider).listar();
});

final miDashboardProvider =
    FutureProvider.autoDispose<MiInicioDashboard>((ref) async {
  return ref.watch(misGuiasRepositoryProvider).dashboard();
});

final consignatariosListProvider =
    FutureProvider.autoDispose<List<Consignatario>>((ref) async {
  return ref.watch(consignatariosRepositoryProvider).listar();
});

typedef GuiaConPiezas = ({GuiaMaster guia, List<Paquete> piezas});

final guiaDetalleProvider =
    FutureProvider.autoDispose.family<GuiaConPiezas, int>((ref, id) async {
  final r = ref.watch(misGuiasRepositoryProvider);
  final guia = await r.obtener(id);
  final piezas = await r.piezas(id);
  return (guia: guia, piezas: piezas);
});
