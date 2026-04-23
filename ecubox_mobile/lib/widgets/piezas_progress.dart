import 'package:flutter/material.dart';

/// Progreso de piezas registradas respecto al total esperado.
class PiezasProgress extends StatelessWidget {
  const PiezasProgress({
    super.key,
    required this.registradas,
    this.total,
  });

  final int registradas;
  final int? total;

  @override
  Widget build(BuildContext context) {
    if (total == null || total! <= 0) {
      return Text(
        '$registradas registrada${registradas == 1 ? '' : 's'} · total por confirmar',
        style: Theme.of(context).textTheme.bodySmall,
      );
    }
    final t = total!;
    final v = (registradas / t).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$registradas / $t piezas',
          style: Theme.of(context).textTheme.labelLarge,
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: v,
            minHeight: 6,
            backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
            color: Theme.of(context).colorScheme.primary,
          ),
        ),
      ],
    );
  }
}
