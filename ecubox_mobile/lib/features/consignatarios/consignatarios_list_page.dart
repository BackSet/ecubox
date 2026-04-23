import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_error.dart';
import '../../models/consignatario.dart';
import '../../providers/app_providers.dart';
import '../../widgets/ecubox_brand_title.dart';

class ConsignatariosListPage extends ConsumerWidget {
  const ConsignatariosListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(consignatariosListProvider);

    return Scaffold(
      appBar: AppBar(
        title: const EcuboxBrandTitle(fontSize: 18),
        actions: [
          IconButton(
            tooltip: 'Cerrar sesión',
            onPressed: () async {
              await ref.read(authControllerProvider.notifier).logout();
              if (context.mounted) context.go('/login');
            },
            icon: const Icon(Icons.logout),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          ref.invalidate(consignatariosListProvider);
          await ref.read(consignatariosListProvider.future);
        },
        child: async.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: [
              SizedBox(
                height: MediaQuery.sizeOf(context).height * 0.3,
                child: Center(child: Text(messageFromDio(e))),
              ),
            ],
          ),
          data: (List<Consignatario> list) {
            if (list.isEmpty) {
              return ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  SizedBox(
                    height: MediaQuery.sizeOf(context).height * 0.35,
                    child: const Center(
                      child: Text(
                        'No hay destinatarios.\nCrea el primero con el botón +',
                        textAlign: TextAlign.center,
                      ),
                    ),
                  ),
                ],
              );
            }
            return ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              itemCount: list.length,
              separatorBuilder: (BuildContext context, int index) =>
                  const SizedBox(height: 10),
              itemBuilder: (context, i) {
                final c = list[i];
                return Card(
                  child: ListTile(
                    title: Text(c.nombre),
                    subtitle: Text(
                      [c.canton, c.provincia].where((e) => e.isNotEmpty).join(', '),
                    ),
                    trailing: c.codigo != null && c.codigo!.isNotEmpty
                        ? Text(c.codigo!, style: const TextStyle(fontSize: 12))
                        : null,
                  ),
                );
              },
            );
          },
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/consignatarios/nuevo'),
        icon: const Icon(Icons.person_add_outlined),
        label: const Text('Nuevo'),
      ),
    );
  }
}
