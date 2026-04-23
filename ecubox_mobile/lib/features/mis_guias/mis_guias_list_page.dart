import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_error.dart';
import '../../models/guia_master.dart';
import '../../models/mi_inicio_dashboard.dart';
import '../../providers/app_providers.dart';
import '../../widgets/ecubox_brand_title.dart';
import '../../widgets/ecubox_card.dart';
import '../../widgets/estado_guia_chip.dart';
import '../../widgets/piezas_progress.dart';

class MisGuiasListPage extends ConsumerWidget {
  const MisGuiasListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(misGuiasListProvider);
    final dashAsync = ref.watch(miDashboardProvider);

    return Scaffold(
      appBar: AppBar(
        title: const EcuboxBrandTitle(),
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
          ref.invalidate(misGuiasListProvider);
          ref.invalidate(miDashboardProvider);
          await ref.read(misGuiasListProvider.future);
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
                child: dashAsync.when(
                  data: (d) => _KpiRow(dashboard: d),
                  loading: () => const SizedBox.shrink(),
                  // KPI opcional: no bloquear la lista si falla el resumen.
                  error: (Object e, StackTrace st) {
                    debugPrint('Mi inicio dashboard: $e');
                    return const SizedBox.shrink();
                  },
                ),
              ),
            ),
            async.when(
              loading: () => const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              ),
              error: (e, _) => SliverFillRemaining(
                child: Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(
                      messageFromDio(e),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
              data: (guias) {
                if (guias.isEmpty) {
                  return SliverFillRemaining(
                    child: Center(
                      child: Text(
                        'Aún no tienes guías registradas.\nToca + para crear la primera.',
                        textAlign: TextAlign.center,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                  );
                }
                return SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) {
                        final g = guias[i];
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _GuiaCard(guia: g),
                        );
                      },
                      childCount: guias.length,
                    ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/mis-guias/registrar'),
        icon: const Icon(Icons.add),
        label: const Text('Nueva guía'),
      ),
    );
  }
}

class _KpiRow extends StatelessWidget {
  const _KpiRow({required this.dashboard});

  final MiInicioDashboard dashboard;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: ListView(
        scrollDirection: Axis.horizontal,
        children: [
          _KpiChip(
            label: 'Guías',
            value: '${dashboard.totalGuias}',
            icon: Icons.inventory_2_outlined,
          ),
          _KpiChip(
            label: 'Activas',
            value: '${dashboard.totalGuiasActivas}',
            icon: Icons.local_shipping_outlined,
          ),
          _KpiChip(
            label: 'Destinatarios',
            value: '${dashboard.totalDestinatarios}',
            icon: Icons.people_outline,
          ),
          _KpiChip(
            label: 'Piezas en tránsito',
            value: '${dashboard.piezasEnTransito}',
            icon: Icons.move_to_inbox,
          ),
        ],
      ),
    );
  }
}

class _KpiChip extends StatelessWidget {
  const _KpiChip({
    required this.label,
    required this.value,
    required this.icon,
  });

  final String label;
  final String value;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 10),
      child: EcuboxCard(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        child: SizedBox(
          width: 132,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 18, color: Theme.of(context).colorScheme.primary),
              const Spacer(),
              Text(
                value,
                style: Theme.of(context).textTheme.titleMedium,
              ),
              Text(
                label,
                style: Theme.of(context).textTheme.bodySmall,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _GuiaCard extends StatelessWidget {
  const _GuiaCard({required this.guia});

  final GuiaMaster guia;

  @override
  Widget build(BuildContext context) {
    final totalPendiente = guia.totalPiezasEsperadas == null;
    return EcuboxCard(
      onTap: () => context.push('/mis-guias/${guia.id}'),
      borderColor: totalPendiente
          ? const Color(0xFFF59E0B).withValues(alpha: 0.45)
          : null,
      backgroundColor: totalPendiente
          ? const Color(0xFFFFF7ED)
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Text(
                  guia.trackingBase,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontFamily: 'monospace',
                        fontWeight: FontWeight.w600,
                      ),
                ),
              ),
              EstadoGuiaChip(estado: guia.estadoGlobal),
            ],
          ),
          const SizedBox(height: 12),
          PiezasProgress(
            registradas: guia.piezasRegistradas ?? 0,
            total: guia.totalPiezasEsperadas,
          ),
          const SizedBox(height: 10),
          Text(
            'Destinatario',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          Text(
            guia.consignatarioNombre?.isNotEmpty == true
                ? guia.consignatarioNombre!
                : 'Sin asignar',
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ],
      ),
    );
  }
}
