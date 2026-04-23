import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_error.dart';
import '../../models/guia_master.dart';
import '../../providers/app_providers.dart';
import '../../widgets/estado_guia_chip.dart';
import '../../widgets/piezas_progress.dart';

class GuiaDetailPage extends ConsumerWidget {
  const GuiaDetailPage({super.key, required this.id});

  final int id;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final async = ref.watch(guiaDetalleProvider(id));

    return Scaffold(
      appBar: AppBar(
        title: Text('Guía #$id'),
        actions: [
          Consumer(
            builder: (context, ref, _) {
              final s = ref.watch(guiaDetalleProvider(id));
              return s.maybeWhen(
                data: (tuple) {
                  if (!isEstadoEditableCliente(tuple.guia.estadoGlobal)) {
                    return const SizedBox.shrink();
                  }
                  return IconButton(
                    icon: const Icon(Icons.edit_outlined),
                    onPressed: () => context.push('/mis-guias/$id/editar'),
                  );
                },
                orElse: () => const SizedBox.shrink(),
              );
            },
          ),
        ],
      ),
      body: async.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (e, _) => Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(messageFromDio(e), textAlign: TextAlign.center),
          ),
        ),
        data: (tuple) {
          final g = tuple.guia;
          final piezas = tuple.piezas;
          final editable = isEstadoEditableCliente(g.estadoGlobal);
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              SelectableText(
                g.trackingBase,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontFamily: 'monospace',
                      fontWeight: FontWeight.w600,
                    ),
              ),
              const SizedBox(height: 8),
              EstadoGuiaChip(estado: g.estadoGlobal),
              const SizedBox(height: 20),
              PiezasProgress(
                registradas: g.piezasRegistradas ?? 0,
                total: g.totalPiezasEsperadas,
              ),
              const SizedBox(height: 24),
              Text('Destinatario', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 6),
              Text(
                g.consignatarioNombre ?? 'Sin asignar',
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              if (g.consignatarioTelefono != null) ...[
                const SizedBox(height: 4),
                Text(g.consignatarioTelefono!, style: Theme.of(context).textTheme.bodyMedium),
              ],
              if (g.consignatarioDireccion != null) ...[
                const SizedBox(height: 4),
                Text(g.consignatarioDireccion!, style: Theme.of(context).textTheme.bodySmall),
              ],
              const SizedBox(height: 28),
              Text('Piezas (${piezas.length})', style: Theme.of(context).textTheme.titleSmall),
              const SizedBox(height: 8),
              ...piezas.map((p) => Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Text(
                        p.numeroGuia ?? 'Pieza ${p.piezaNumero ?? ''}',
                        style: const TextStyle(fontFamily: 'monospace', fontSize: 13),
                      ),
                      subtitle: Text(
                        p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—',
                      ),
                    ),
                  )),
              if (editable) ...[
                const SizedBox(height: 24),
                OutlinedButton.icon(
                  onPressed: () => _confirmDelete(context, ref),
                  icon: const Icon(Icons.delete_outline),
                  label: const Text('Eliminar guía'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Theme.of(context).colorScheme.error,
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Future<void> _confirmDelete(BuildContext context, WidgetRef ref) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('¿Eliminar guía?'),
        content: const Text('Esta acción no se puede deshacer.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancelar')),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Eliminar'),
          ),
        ],
      ),
    );
    if (ok != true || !context.mounted) return;
    try {
      await ref.read(misGuiasRepositoryProvider).eliminar(id);
      ref.invalidate(guiaDetalleProvider(id));
      ref.invalidate(misGuiasListProvider);
      ref.invalidate(miDashboardProvider);
      if (context.mounted) context.go('/mis-guias');
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageFromDio(e))),
        );
      }
    }
  }
}
