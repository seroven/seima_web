import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/seima_colors.dart';
import '../theme/seima_theme.dart';
import '../widgets/capas_marca.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: SystemUiOverlayStyle.light,
      child: Scaffold(
        backgroundColor: SeimaColors.ink,
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CapasMarca(ancho: 120),
              const SizedBox(height: 24),
              Text('SEIMA', style: archivo(40, 850, width: 118, height: 1, color: Colors.white)),
            ],
          ),
        ),
      ),
    );
  }
}
