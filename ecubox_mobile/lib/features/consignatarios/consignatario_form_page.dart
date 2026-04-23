import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/api_error.dart';
import '../../models/consignatario.dart';
import '../../providers/app_providers.dart';

class ConsignatarioFormPage extends ConsumerStatefulWidget {
  const ConsignatarioFormPage({super.key});

  @override
  ConsumerState<ConsignatarioFormPage> createState() => _ConsignatarioFormPageState();
}

class _ConsignatarioFormPageState extends ConsumerState<ConsignatarioFormPage> {
  final _nombre = TextEditingController();
  final _telefono = TextEditingController();
  final _direccion = TextEditingController();
  final _provincia = TextEditingController();
  final _canton = TextEditingController();
  final _codigo = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _loading = false;
  String? _error;

  @override
  void dispose() {
    _nombre.dispose();
    _telefono.dispose();
    _direccion.dispose();
    _provincia.dispose();
    _canton.dispose();
    _codigo.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final body = Consignatario(
        id: 0,
        nombre: _nombre.text.trim(),
        telefono: _telefono.text.trim(),
        direccion: _direccion.text.trim(),
        provincia: _provincia.text.trim(),
        canton: _canton.text.trim(),
        codigo: _codigo.text.trim().isEmpty ? null : _codigo.text.trim(),
      );
      await ref.read(consignatariosRepositoryProvider).crear(body);
      ref.invalidate(consignatariosListProvider);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Destinatario creado')),
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
    return Scaffold(
      appBar: AppBar(title: const Text('Nuevo destinatario')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            TextFormField(
              controller: _nombre,
              decoration: const InputDecoration(labelText: 'Nombre *'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Obligatorio' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _telefono,
              decoration: const InputDecoration(labelText: 'Teléfono *'),
              keyboardType: TextInputType.phone,
              validator: (v) => v == null || v.trim().isEmpty ? 'Obligatorio' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _direccion,
              decoration: const InputDecoration(labelText: 'Dirección *'),
              maxLines: 2,
              validator: (v) => v == null || v.trim().isEmpty ? 'Obligatorio' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _provincia,
              decoration: const InputDecoration(labelText: 'Provincia *'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Obligatorio' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _canton,
              decoration: const InputDecoration(labelText: 'Cantón *'),
              validator: (v) => v == null || v.trim().isEmpty ? 'Obligatorio' : null,
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _codigo,
              decoration: const InputDecoration(
                labelText: 'Código (opcional)',
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ],
            const SizedBox(height: 28),
            FilledButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(
                      height: 22,
                      width: 22,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Text('Guardar'),
            ),
          ],
        ),
      ),
    );
  }
}
