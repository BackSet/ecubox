import 'guia_master.dart';

class MiInicioDashboard {
  const MiInicioDashboard({
    this.conteosPorEstado = const {},
    this.totalGuias = 0,
    this.totalGuiasActivas = 0,
    this.totalGuiasCerradas = 0,
    this.totalGuiasSinTotalDefinido = 0,
    this.totalDestinatarios = 0,
    this.piezasEnTransito = 0,
    this.guiasRecientes = const [],
    this.guiasProximasACerrar = const [],
  });

  final Map<String, int> conteosPorEstado;
  final int totalGuias;
  final int totalGuiasActivas;
  final int totalGuiasCerradas;
  final int totalGuiasSinTotalDefinido;
  final int totalDestinatarios;
  final int piezasEnTransito;
  final List<GuiaMaster> guiasRecientes;
  final List<GuiaMaster> guiasProximasACerrar;

  factory MiInicioDashboard.fromJson(Map<String, dynamic> json) {
    final raw = json['conteosPorEstado'];
    final map = <String, int>{};
    if (raw is Map) {
      raw.forEach((k, v) {
        if (v is num) map[k.toString()] = v.toInt();
      });
    }
    return MiInicioDashboard(
      conteosPorEstado: map,
      totalGuias: (json['totalGuias'] as num?)?.toInt() ?? 0,
      totalGuiasActivas: (json['totalGuiasActivas'] as num?)?.toInt() ?? 0,
      totalGuiasCerradas: (json['totalGuiasCerradas'] as num?)?.toInt() ?? 0,
      totalGuiasSinTotalDefinido:
          (json['totalGuiasSinTotalDefinido'] as num?)?.toInt() ?? 0,
      totalDestinatarios: (json['totalDestinatarios'] as num?)?.toInt() ??
          (json['totalConsignatarios'] as num?)?.toInt() ??
          0,
      piezasEnTransito: (json['piezasEnTransito'] as num?)?.toInt() ?? 0,
      guiasRecientes: (json['guiasRecientes'] as List<dynamic>?)
              ?.map((e) => GuiaMaster.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      guiasProximasACerrar: (json['guiasProximasACerrar'] as List<dynamic>?)
              ?.map((e) => GuiaMaster.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}
