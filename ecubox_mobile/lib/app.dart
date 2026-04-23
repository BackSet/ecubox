import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router/app_router.dart';
import 'theme/ecubox_theme.dart';

class EcuboxApp extends ConsumerWidget {
  const EcuboxApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(goRouterProvider);
    return MaterialApp.router(
      title: 'ECUBOX',
      debugShowCheckedModeBanner: false,
      theme: EcuboxTheme.light(),
      darkTheme: EcuboxTheme.dark(),
      themeMode: ThemeMode.system,
      routerConfig: router,
    );
  }
}
