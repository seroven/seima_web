import 'package:flutter/material.dart';

import '../theme/seima_colors.dart';

class FotoLlena extends StatelessWidget {
  const FotoLlena(this.url, {super.key});

  final String url;

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) return const ColoredBox(color: SeimaColors.paper2);
    return Image.network(url, fit: BoxFit.cover, errorBuilder: (_, _, _) => const ColoredBox(color: SeimaColors.paper2));
  }
}
