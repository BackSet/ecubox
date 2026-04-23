import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Tokens alineados con [ecubox-frontend/src/index.css] (:root y .dark).
abstract final class EcuboxTheme {
  static String? _interFamily;

  static String _interFontFamily() =>
      _interFamily ??= GoogleFonts.inter().fontFamily!;

  static TextStyle _interStyle({
    required double fontSize,
    FontWeight? fontWeight,
    double? height,
    required Color color,
  }) {
    return TextStyle(
      fontFamily: _interFontFamily(),
      fontSize: fontSize,
      fontWeight: fontWeight,
      height: height,
      color: color,
    );
  }

  // Light — :root
  static const Color _primaryLight = Color(0xFF7B3FE4);
  static const Color _marca = Color(0xFF1246A0);
  static const Color _acento = Color(0xFF2E6BE6);
  static const Color _background = Color(0xFFFBFBFA);
  static const Color _card = Color(0xFFFFFFFF);
  static const Color _foreground = Color(0xFF1A1A1A);
  static const Color _mutedFg = Color(0xFF6B6B6B);
  static const Color _border = Color(0xFFE6E6E3);
  static const Color _destructive = Color(0xFFB42318);

  // Dark
  static const Color _primaryDark = Color(0xFF9B6AF0);
  static const Color _backgroundDark = Color(0xFF1A1A1A);
  static const Color _cardDark = Color(0xFF232323);
  static const Color _foregroundDark = Color(0xFFECECEC);
  static const Color _mutedFgDark = Color(0xFFA0A0A0);
  static const Color _mutedDark = Color(0xFF2A2A2A);
  static const Color _borderDark = Color(0xFF333333);
  static const Color _destructiveDark = Color(0xFFDC2626);

  static ThemeData light() {
    final colorScheme = ColorScheme.light(
      primary: _primaryLight,
      onPrimary: Colors.white,
      secondary: _acento,
      onSecondary: Colors.white,
      surface: _card,
      onSurface: _foreground,
      error: _destructive,
      onError: Colors.white,
      outline: _border,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: _background,
      cardColor: _card,
      dividerColor: _border,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        backgroundColor: _background,
        foregroundColor: _foreground,
        titleTextStyle: _interStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: _foreground,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: _primaryLight.withValues(alpha: 0.15),
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => _interStyle(
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500,
            color: _foreground,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _primaryLight,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: _marca,
          side: const BorderSide(color: _border),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _card,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: _border),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: _border),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: _primaryLight, width: 2),
        ),
        labelStyle: _interStyle(fontSize: 14, color: _mutedFg),
      ),
      textTheme: _textTheme(_foreground, _mutedFg),
    );
  }

  static ThemeData dark() {
    final colorScheme = ColorScheme.dark(
      primary: _primaryDark,
      onPrimary: Colors.white,
      secondary: _acento,
      onSecondary: Colors.white,
      surface: _cardDark,
      onSurface: _foregroundDark,
      error: _destructiveDark,
      onError: Colors.white,
      outline: _borderDark,
    );
    return ThemeData(
      useMaterial3: true,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: _backgroundDark,
      cardColor: _cardDark,
      dividerColor: _borderDark,
      appBarTheme: AppBarTheme(
        centerTitle: false,
        elevation: 0,
        scrolledUnderElevation: 0.5,
        backgroundColor: _backgroundDark,
        foregroundColor: _foregroundDark,
        titleTextStyle: _interStyle(
          fontSize: 18,
          fontWeight: FontWeight.w600,
          color: _foregroundDark,
        ),
      ),
      navigationBarTheme: NavigationBarThemeData(
        indicatorColor: _primaryDark.withValues(alpha: 0.2),
        backgroundColor: _cardDark,
        labelTextStyle: WidgetStateProperty.resolveWith(
          (s) => _interStyle(
            fontSize: 12,
            fontWeight: s.contains(WidgetState.selected) ? FontWeight.w600 : FontWeight.w500,
            color: _foregroundDark,
          ),
        ),
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _primaryDark,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: _mutedDark,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: _borderDark),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: _borderDark),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(8),
          borderSide: const BorderSide(color: _primaryDark, width: 2),
        ),
        labelStyle: _interStyle(fontSize: 14, color: _mutedFgDark),
      ),
      textTheme: _textTheme(_foregroundDark, _mutedFgDark),
    );
  }

  static TextTheme _textTheme(Color fg, Color muted) {
    return TextTheme(
      titleLarge: _interStyle(fontSize: 22, fontWeight: FontWeight.w600, color: fg),
      titleMedium: _interStyle(fontSize: 18, fontWeight: FontWeight.w600, color: fg),
      titleSmall: _interStyle(fontSize: 15, fontWeight: FontWeight.w600, color: fg),
      bodyLarge: _interStyle(fontSize: 16, height: 1.4, color: fg),
      bodyMedium: _interStyle(fontSize: 14, height: 1.4, color: fg),
      bodySmall: _interStyle(fontSize: 12, height: 1.35, color: muted),
      labelLarge: _interStyle(fontSize: 14, fontWeight: FontWeight.w600, color: fg),
    );
  }

  /// Color de marca para textos destacados (logo, enlaces).
  static Color marcaColor(Brightness b) =>
      b == Brightness.dark ? _acento : _marca;
}
