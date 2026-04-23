import 'paquete.dart';

class GuiaMaster {
  const GuiaMaster({
    required this.id,
    required this.trackingBase,
    required this.estadoGlobal,
    this.totalPiezasEsperadas,
    this.consignatarioId,
    this.consignatarioNombre,
    this.consignatarioTelefono,
    this.consignatarioDireccion,
    this.consignatarioProvincia,
    this.consignatarioCanton,
    this.consignatarioInferido,
    this.piezasRegistradas,
    this.piezasRecibidas,
    this.piezasDespachadas,
    this.createdAt,
    this.piezas,
  });

  final int id;
  final String trackingBase;
  final String estadoGlobal;
  final int? totalPiezasEsperadas;
  final int? consignatarioId;
  final String? consignatarioNombre;
  final String? consignatarioTelefono;
  final String? consignatarioDireccion;
  final String? consignatarioProvincia;
  final String? consignatarioCanton;
  final bool? consignatarioInferido;
  final int? piezasRegistradas;
  final int? piezasRecibidas;
  final int? piezasDespachadas;
  final String? createdAt;
  final List<Paquete>? piezas;

  factory GuiaMaster.fromJson(Map<String, dynamic> json) {
    return GuiaMaster(
      id: (json['id'] as num).toInt(),
      trackingBase: json['trackingBase'] as String? ?? '',
      estadoGlobal: json['estadoGlobal'] as String? ?? 'EN_ESPERA_RECEPCION',
      totalPiezasEsperadas: (json['totalPiezasEsperadas'] as num?)?.toInt(),
      consignatarioId: (json['consignatarioId'] as num?)?.toInt(),
      consignatarioNombre: json['consignatarioNombre'] as String?,
      consignatarioTelefono: json['consignatarioTelefono'] as String?,
      consignatarioDireccion: json['consignatarioDireccion'] as String?,
      consignatarioProvincia: json['consignatarioProvincia'] as String?,
      consignatarioCanton: json['consignatarioCanton'] as String?,
      consignatarioInferido: json['consignatarioInferido'] as bool?,
      piezasRegistradas: (json['piezasRegistradas'] as num?)?.toInt(),
      piezasRecibidas: (json['piezasRecibidas'] as num?)?.toInt(),
      piezasDespachadas: (json['piezasDespachadas'] as num?)?.toInt(),
      createdAt: json['createdAt'] as String?,
      piezas: (json['piezas'] as List<dynamic>?)
          ?.map((e) => Paquete.fromJson(e as Map<String, dynamic>))
          .toList(),
    );
  }
}

bool isEstadoEditableCliente(String estado) {
  return estado == 'SIN_PIEZAS_REGISTRADAS' || estado == 'EN_ESPERA_RECEPCION';
}
