import 'package:flutter/material.dart';

import '../theme/estado_cliente_labels.dart';

/// Chip de estado alineado con la semántica cliente del web.
class EstadoGuiaChip extends StatelessWidget {
  const EstadoGuiaChip({super.key, required this.estado});

  final String estado;

  @override
  Widget build(BuildContext context) {
    final label = estadoLabelCorto(estado);
    final (bg, fg) = _colorsFor(context, estado);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: fg.withValues(alpha: 0.25)),
      ),
      child: Text(
        label,
        style: Theme.of(context).textTheme.labelLarge?.copyWith(
              fontSize: 12,
              color: fg,
              fontWeight: FontWeight.w600,
            ),
      ),
    );
  }

  (Color bg, Color fg) _colorsFor(BuildContext context, String e) {
    final scheme = Theme.of(context).colorScheme;
    switch (e) {
      case 'DESPACHO_COMPLETADO':
        return (const Color(0xFFDCFCE7), const Color(0xFF166534));
      case 'DESPACHO_INCOMPLETO':
      case 'EN_REVISION':
        return (const Color(0xFFFEF3C7), const Color(0xFFB45309));
      case 'DESPACHO_PARCIAL':
      case 'RECEPCION_PARCIAL':
      case 'RECEPCION_COMPLETA':
        return (scheme.primaryContainer.withValues(alpha: 0.5), scheme.primary);
      case 'CANCELADA':
        return (Theme.of(context).colorScheme.surfaceContainerHighest,
            Theme.of(context).colorScheme.onSurfaceVariant);
      default:
        return (Theme.of(context).colorScheme.surfaceContainerHighest,
            Theme.of(context).colorScheme.onSurfaceVariant);
    }
  }
}
