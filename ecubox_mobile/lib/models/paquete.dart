class Paquete {
  const Paquete({
    required this.id,
    this.numeroGuia,
    this.piezaNumero,
    this.piezaTotal,
    this.estadoRastreoNombre,
    this.estadoRastreoCodigo,
    this.consignatarioNombre,
    this.ref,
  });

  final int id;
  final String? numeroGuia;
  final int? piezaNumero;
  final int? piezaTotal;
  final String? estadoRastreoNombre;
  final String? estadoRastreoCodigo;
  final String? consignatarioNombre;
  final String? ref;

  factory Paquete.fromJson(Map<String, dynamic> json) {
    return Paquete(
      id: (json['id'] as num).toInt(),
      numeroGuia: json['numeroGuia'] as String?,
      piezaNumero: (json['piezaNumero'] as num?)?.toInt(),
      piezaTotal: (json['piezaTotal'] as num?)?.toInt(),
      estadoRastreoNombre: json['estadoRastreoNombre'] as String?,
      estadoRastreoCodigo: json['estadoRastreoCodigo'] as String?,
      consignatarioNombre: json['consignatarioNombre'] as String?,
      ref: json['ref'] as String?,
    );
  }
}
