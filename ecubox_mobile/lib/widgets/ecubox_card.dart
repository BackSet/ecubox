import 'package:flutter/material.dart';

class EcuboxCard extends StatelessWidget {
  const EcuboxCard({
    super.key,
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.all(14),
    this.borderColor,
    this.backgroundColor,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;
  final Color? borderColor;
  final Color? backgroundColor;

  @override
  Widget build(BuildContext context) {
    final border = Theme.of(context).dividerColor;
    final bg = backgroundColor ?? Theme.of(context).colorScheme.surface;
    final radius = BorderRadius.circular(12);
    final decoration = BoxDecoration(
      color: bg,
      borderRadius: radius,
      border: Border.all(color: borderColor ?? border),
    );

    if (onTap == null) {
      return DecoratedBox(
        decoration: decoration,
        child: Padding(padding: padding, child: child),
      );
    }

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: radius,
        child: Ink(
          decoration: decoration,
          child: Padding(
            padding: padding,
            child: child,
          ),
        ),
      ),
    );
  }
}
