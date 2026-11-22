import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../theme/seima_colors.dart';

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
              Image.asset('assets/img/logo.png', width: 260, semanticLabel: 'SEIMA Servicios Generales'),
            ],
          ),
        ),
      ),
    );
  }
}
