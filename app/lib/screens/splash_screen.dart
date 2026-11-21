import 'package:flutter/material.dart';

import '../theme/seima_theme.dart';

class SplashScreen extends StatelessWidget {
  const SplashScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('SEIMA', style: archivo(40, 850, width: 118, height: 1))),
    );
  }
}
