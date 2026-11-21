import 'package:flutter/material.dart';

import 'seima_colors.dart';

TextStyle archivo(
  double size,
  double weight, {
  double width = 100,
  double height = 1.35,
  Color color = SeimaColors.ink,
}) {
  return TextStyle(
    fontFamily: 'Archivo',
    fontSize: size,
    height: height,
    color: color,
    fontVariations: [FontVariation('wght', weight), FontVariation('wdth', width)],
  );
}

ThemeData seimaTheme() {
  final texto = TextTheme(
    bodyLarge: archivo(18, 500),
    bodyMedium: archivo(18, 500),
    titleLarge: archivo(28, 850, width: 118, height: 1.05),
    headlineMedium: archivo(40, 850, width: 118, height: 1.02),
  );
  final borde = OutlineInputBorder(
    borderRadius: BorderRadius.circular(14),
    borderSide: BorderSide.none,
  );
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: SeimaColors.paper,
    colorScheme: const ColorScheme.light(
      primary: SeimaColors.red,
      onPrimary: Colors.white,
      surface: SeimaColors.paper,
      onSurface: SeimaColors.ink,
      error: SeimaColors.redText,
    ),
    textTheme: texto,
    appBarTheme: AppBarTheme(
      backgroundColor: SeimaColors.paper,
      foregroundColor: SeimaColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      titleTextStyle: archivo(22, 800, width: 118, height: 1.1),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: SeimaColors.red,
        foregroundColor: Colors.white,
        disabledBackgroundColor: SeimaColors.tint2,
        disabledForegroundColor: SeimaColors.muted,
        minimumSize: const Size.fromHeight(56),
        textStyle: archivo(18, 800, height: 1.1, color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: SeimaColors.paper2,
      hintStyle: archivo(18, 500, color: SeimaColors.muted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
      border: borde,
      enabledBorder: borde,
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: SeimaColors.red, width: 3),
      ),
      errorBorder: borde,
      focusedErrorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(14),
        borderSide: const BorderSide(color: SeimaColors.red, width: 3),
      ),
      errorStyle: archivo(16, 600, color: SeimaColors.redText, height: 1.3),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: SeimaColors.red),
    navigationBarTheme: NavigationBarThemeData(
      height: 76,
      backgroundColor: SeimaColors.paper,
      indicatorColor: SeimaColors.paper2,
      labelTextStyle: WidgetStatePropertyAll(archivo(14, 650, height: 1.1)),
      iconTheme: const WidgetStatePropertyAll(IconThemeData(size: 26)),
    ),
  );
}
