import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_error.dart';
import '../../models/consignatario.dart';
import '../../providers/app_providers.dart';

class GuiaFormPage extends ConsumerStatefulWidget {
  const GuiaFormPage.create({super.key}) : id = null;
  const GuiaFormPage.edit({super.key, required this.id});

  final int? id;

  bool get isEdit => id != null;

  @override
  ConsumerState<GuiaFormPage> createState() => _GuiaFormPageState();
}

class _GuiaFormPageState extends ConsumerState<GuiaFormPage> {
  final _tracking = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  int? _consignatarioId;
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (widget.isEdit) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadGuia());
    }
  }

  Future<void> _loadGuia() async {
    final gid = widget.id!;
    try {
      final g = await ref.read(misGuiasRepositoryProvider).obtener(gid);
      if (!mounted) return;
      _tracking.text = g.trackingBase;
      setState(() => _consignatarioId = g.consignatarioId);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(messageFromDio(e))),
        );
        context.pop();
      }
    }
  }

  @override
  void dispose() {
    _tracking.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_consignatarioId == null) {
      setState(() => _error = 'Selecciona un destinatario');
      return;
    }
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final repo = ref.read(misGuiasRepositoryProvider);
      if (widget.isEdit) {
        await repo.actualizar(
          id: widget.id!,
          trackingBase: _tracking.text.trim(),
          consignatarioId: _consignatarioId!,
        );
      } else {
        await repo.registrar(
          trackingBase: _tracking.text.trim(),
          consignatarioId: _consignatarioId!,
        );
      }
      ref.invalidate(misGuiasListProvider);
      ref.invalidate(miDashboardProvider);
      if (widget.isEdit) {
        ref.invalidate(guiaDetalleProvider(widget.id!));
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(widget.isEdit ? 'Guía actualizada' : 'Guía registrada')),
        );
        context.pop();
      }
    } catch (e) {
      setState(() => _error = messageFromDio(e));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final consAsync = ref.watch(consignatariosListProvider);

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isEdit ? 'Editar guía' : 'Nueva guía'),
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextFormField(
              controller: _tracking,
              decoration: const InputDecoration(
                labelText: 'Número de guía',
                hintText: 'Ej: 1Z52159R0379385035',
              ),
              validator: (v) =>
                  v == null || v.trim().isEmpty ? 'Campo obligatorio' : null,
            ),
            const SizedBox(height: 20),
            Text('Destinatario', style: Theme.of(context).textTheme.titleSmall),
            const SizedBox(height: 8),
            consAsync.when(
              loading: () => const LinearProgressIndicator(),
              error: (e, _) => Text(messageFromDio(e)),
              data: (List<Consignatario> list) {
                if (list.isEmpty) {
                  return Text(
                    'No tienes destinatarios. Crea uno en la pestaña Destinatarios.',
                    style: TextStyle(color: Theme.of(context).colorScheme.error),
                  );
                }
                final validId = _consignatarioId != null &&
                        list.any((c) => c.id == _consignatarioId)
                    ? _consignatarioId
                    : null;
                return DropdownButtonFormField<int>(
                  key: ValueKey<int?>(validId),
                  initialValue: validId,
                  decoration: const InputDecoration(
                    labelText: 'Selecciona destinatario',
                  ),
                  items: list
                      .map(
                        (c) => DropdownMenuItem(
                          value: c.id,
                          child: Text(
                            c.nombre,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      )
                      .toList(),
                  onChanged: (v) => setState(() => _consignatarioId = v),
                  validator: (v) => v == null ? 'Obligatorio' : null,
                );
              },
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 32),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : Text(widget.isEdit ? 'Guardar' : 'Registrar'),
            ),
          ],
        ),
      ),
    );
  }
}
