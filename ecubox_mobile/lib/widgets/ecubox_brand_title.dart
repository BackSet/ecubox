import 'package:flutter/material.dart';

import '../theme/ecubox_theme.dart';

class EcuboxBrandTitle extends StatelessWidget {
  const EcuboxBrandTitle({super.key, this.fontSize = 20});

  final double fontSize;

  @override
  Widget build(BuildContext context) {
    final b = Theme.of(context).brightness;
    return Text.rich(
      TextSpan(
        children: [
          TextSpan(
            text: 'ECU',
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              color: EcuboxTheme.marcaColor(b),
            ),
          ),
          TextSpan(
            text: 'BOX',
            style: TextStyle(
              fontSize: fontSize,
              fontWeight: FontWeight.w800,
              letterSpacing: -0.5,
              color: Theme.of(context).colorScheme.primary,
            ),
          ),
        ],
      ),
    );
  }
}
