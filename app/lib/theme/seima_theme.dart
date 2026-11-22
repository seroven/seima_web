import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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

/// Escala de todo el texto de la app (1 = tamaños de diseño). Se multiplica por el
/// tamaño de letra que la persona tenga en el sistema, así sigue pudiendo agrandarlo.
const escalaTexto = 0.9;

/// Título grande: Archivo ancha y pesada, como en la web.
TextStyle titulo(double size, {Color color = SeimaColors.ink, double height = 1.05}) =>
    archivo(size, 850, width: 118, height: height, color: color);

const _radio = 16.0;

ThemeData seimaTheme() {
  final texto = TextTheme(
    bodyLarge: archivo(18, 500),
    bodyMedium: archivo(18, 500),
    titleLarge: titulo(28),
    headlineMedium: titulo(40, height: 1.02),
  );
  final borde = OutlineInputBorder(
    borderRadius: BorderRadius.circular(_radio),
    borderSide: BorderSide.none,
  );
  final anillo = OutlineInputBorder(
    borderRadius: BorderRadius.circular(_radio),
    borderSide: const BorderSide(color: SeimaColors.red, width: 3),
  );
  return ThemeData(
    useMaterial3: true,
    scaffoldBackgroundColor: SeimaColors.paper,
    splashFactory: InkRipple.splashFactory,
    colorScheme: const ColorScheme.light(
      primary: SeimaColors.red,
      onPrimary: Colors.white,
      surface: SeimaColors.paper,
      onSurface: SeimaColors.ink,
      error: SeimaColors.redText,
    ),
    textTheme: texto,
    pageTransitionsTheme: const PageTransitionsTheme(
      builders: {
        TargetPlatform.android: FadeForwardsPageTransitionsBuilder(),
      },
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: SeimaColors.paper,
      foregroundColor: SeimaColors.ink,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      systemOverlayStyle: SystemUiOverlayStyle.dark,
      titleTextStyle: titulo(22, height: 1.1),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: SeimaColors.red,
        foregroundColor: Colors.white,
        disabledBackgroundColor: SeimaColors.tint2,
        disabledForegroundColor: SeimaColors.muted,
        minimumSize: const Size.fromHeight(58),
        textStyle: archivo(18, 800, height: 1.1, color: Colors.white),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radio)),
      ),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: SeimaColors.ink,
        minimumSize: const Size(56, 56),
        textStyle: archivo(18, 700, height: 1.1),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radio)),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: SeimaColors.paper2,
      hintStyle: archivo(18, 500, color: SeimaColors.muted),
      contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      border: borde,
      enabledBorder: borde,
      focusedBorder: anillo,
      errorBorder: borde,
      focusedErrorBorder: anillo,
      errorStyle: archivo(16, 600, color: SeimaColors.redText, height: 1.3),
    ),
    switchTheme: SwitchThemeData(
      thumbColor: const WidgetStatePropertyAll(Colors.white),
      trackColor: WidgetStateProperty.resolveWith(
        (estados) => estados.contains(WidgetState.selected) ? SeimaColors.red : SeimaColors.tint2,
      ),
      trackOutlineColor: const WidgetStatePropertyAll(Colors.transparent),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: SeimaColors.paper,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
    ),
    snackBarTheme: SnackBarThemeData(
      behavior: SnackBarBehavior.floating,
      backgroundColor: SeimaColors.ink,
      contentTextStyle: archivo(16, 600, color: Colors.white, height: 1.3),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radio)),
    ),
    popupMenuTheme: PopupMenuThemeData(
      color: SeimaColors.paper,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(_radio)),
      textStyle: archivo(18, 650),
    ),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: SeimaColors.red),
    // Barra inferior oscura, como el encabezado de la web.
    navigationBarTheme: NavigationBarThemeData(
      height: 80,
      backgroundColor: SeimaColors.ink,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      indicatorColor: SeimaColors.red,
      indicatorShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      labelTextStyle: WidgetStateProperty.resolveWith(
        (estados) => archivo(
          14,
          estados.contains(WidgetState.selected) ? 750 : 600,
          height: 1.1,
          color: estados.contains(WidgetState.selected) ? Colors.white : SeimaColors.onInkMuted,
        ),
      ),
      iconTheme: WidgetStateProperty.resolveWith(
        (estados) => IconThemeData(
          size: 26,
          color: estados.contains(WidgetState.selected) ? Colors.white : SeimaColors.onInkMuted,
        ),
      ),
    ),
  );
}

/// Campos de texto para pantallas oscuras (entrada).
ThemeData seimaThemeOscuro() {
  final base = seimaTheme();
  final borde = OutlineInputBorder(
    borderRadius: BorderRadius.circular(_radio),
    borderSide: BorderSide.none,
  );
  final anillo = OutlineInputBorder(
    borderRadius: BorderRadius.circular(_radio),
    borderSide: const BorderSide(color: SeimaColors.red, width: 3),
  );
  return base.copyWith(
    scaffoldBackgroundColor: SeimaColors.ink,
    inputDecorationTheme: base.inputDecorationTheme.copyWith(
      fillColor: SeimaColors.ink3,
      prefixIconColor: SeimaColors.onInkMuted,
      suffixIconColor: Colors.white,
      hintStyle: archivo(18, 500, color: SeimaColors.onInkMuted),
      border: borde,
      enabledBorder: borde,
      focusedBorder: anillo,
      focusedErrorBorder: anillo,
      errorBorder: borde,
    ),
    iconTheme: const IconThemeData(color: SeimaColors.onInkMuted),
    textSelectionTheme: const TextSelectionThemeData(
      cursorColor: SeimaColors.red,
      selectionHandleColor: SeimaColors.red,
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        foregroundColor: Colors.white,
        minimumSize: const Size(56, 56),
        textStyle: archivo(18, 700, height: 1.1),
      ),
    ),
  );
}
