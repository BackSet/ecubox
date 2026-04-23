class Consignatario {
  const Consignatario({
    required this.id,
    required this.nombre,
    required this.telefono,
    required this.direccion,
    required this.provincia,
    required this.canton,
    this.codigo,
  });

  final int id;
  final String nombre;
  final String telefono;
  final String direccion;
  final String provincia;
  final String canton;
  final String? codigo;

  factory Consignatario.fromJson(Map<String, dynamic> json) {
    return Consignatario(
      id: (json['id'] as num).toInt(),
      nombre: json['nombre'] as String? ?? '',
      telefono: json['telefono'] as String? ?? '',
      direccion: json['direccion'] as String? ?? '',
      provincia: json['provincia'] as String? ?? '',
      canton: json['canton'] as String? ?? '',
      codigo: json['codigo'] as String?,
    );
  }

  Map<String, dynamic> toCreateJson() => {
        'nombre': nombre,
        'telefono': telefono,
        'direccion': direccion,
        'provincia': provincia,
        'canton': canton,
        if (codigo != null && codigo!.isNotEmpty) 'codigo': codigo,
      };
}
