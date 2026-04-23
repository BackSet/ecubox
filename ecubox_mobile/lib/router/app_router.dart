import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../features/auth/login_page.dart';
import '../features/auth/splash_page.dart';
import '../features/consignatarios/consignatario_form_page.dart';
import '../features/consignatarios/consignatarios_list_page.dart';
import '../features/mis_guias/guia_detail_page.dart';
import '../features/mis_guias/guia_form_page.dart';
import '../features/mis_guias/mis_guias_list_page.dart';
import '../providers/app_providers.dart';

final goRouterProvider = Provider<GoRouter>((ref) {
  final notifier = GoRouterRefreshNotifier(ref);
  ref.onDispose(notifier.dispose);

  return GoRouter(
    initialLocation: '/splash',
    refreshListenable: notifier,
    redirect: (context, state) {
      final auth = ref.read(authControllerProvider);
      final loc = state.matchedLocation;
      if (!auth.bootstrapped) {
        if (loc != '/splash') return '/splash';
        return null;
      }
      if (loc == '/splash') {
        return auth.isAuthenticated ? '/mis-guias' : '/login';
      }
      final loggingIn = loc == '/login';
      final authed = auth.isAuthenticated;
      if (!authed && !loggingIn) return '/login';
      if (authed && loggingIn) return '/mis-guias';
      return null;
    },
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashPage(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginPage(),
      ),
      ShellRoute(
        builder: (context, state, child) => _ClientShell(child: child),
        routes: [
          GoRoute(
            path: '/mis-guias',
            builder: (context, state) => const MisGuiasListPage(),
            routes: [
              GoRoute(
                path: 'registrar',
                builder: (context, state) => const GuiaFormPage.create(),
              ),
              GoRoute(
                path: ':id',
                builder: (context, state) {
                  final id = int.parse(state.pathParameters['id']!);
                  return GuiaDetailPage(id: id);
                },
                routes: [
                  GoRoute(
                    path: 'editar',
                    builder: (context, state) {
                      final id = int.parse(state.pathParameters['id']!);
                      return GuiaFormPage.edit(id: id);
                    },
                  ),
                ],
              ),
            ],
          ),
          GoRoute(
            path: '/consignatarios',
            builder: (context, state) => const ConsignatariosListPage(),
            routes: [
              GoRoute(
                path: 'nuevo',
                builder: (context, state) => const ConsignatarioFormPage(),
              ),
            ],
          ),
        ],
      ),
    ],
  );
});

class _ClientShell extends StatelessWidget {
  const _ClientShell({required this.child});

  final Widget child;

  static final _mainPaths = {'/mis-guias', '/consignatarios'};

  @override
  Widget build(BuildContext context) {
    final loc = GoRouterState.of(context).uri.path;
    final showNav = _mainPaths.contains(loc);
    final idx = loc.startsWith('/consignatarios') ? 1 : 0;

    return Scaffold(
      body: child,
      bottomNavigationBar: showNav
          ? NavigationBar(
              selectedIndex: idx,
              onDestinationSelected: (i) {
                if (i == 0) context.go('/mis-guias');
                if (i == 1) context.go('/consignatarios');
              },
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.inventory_2_outlined),
                  selectedIcon: Icon(Icons.inventory_2),
                  label: 'Mis guías',
                ),
                NavigationDestination(
                  icon: Icon(Icons.place_outlined),
                  selectedIcon: Icon(Icons.place),
                  label: 'Destinatarios',
                ),
              ],
            )
          : null,
    );
  }
}

class GoRouterRefreshNotifier extends ChangeNotifier {
  GoRouterRefreshNotifier(this._ref) {
    _sub = _ref.listen(authControllerProvider, (Object? previous, Object? next) {
      notifyListeners();
    });
  }

  final Ref _ref;
  late final ProviderSubscription<AuthState> _sub;

  @override
  void dispose() {
    _sub.close();
    super.dispose();
  }
}
