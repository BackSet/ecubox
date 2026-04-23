import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:ecubox_mobile/app.dart';

void main() {
  testWidgets('La app arranca con ProviderScope', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: EcuboxApp()));
    await tester.pump();
    expect(find.byType(EcuboxApp), findsOneWidget);
  });
}
