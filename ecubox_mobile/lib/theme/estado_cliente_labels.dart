/// Etiquetas cortas para el cliente (misma semántica que el web).
String estadoLabelCorto(String estado) {
  switch (estado) {
    case 'SIN_PIEZAS_REGISTRADAS':
      return 'Sin piezas';
    case 'EN_ESPERA_RECEPCION':
      return 'En espera';
    case 'RECEPCION_PARCIAL':
      return 'Parcial en bodega';
    case 'RECEPCION_COMPLETA':
      return 'En bodega';
    case 'DESPACHO_PARCIAL':
      return 'En camino';
    case 'DESPACHO_COMPLETADO':
      return 'Entregada';
    case 'DESPACHO_INCOMPLETO':
      return 'Con faltante';
    case 'CANCELADA':
      return 'Cancelada';
    case 'EN_REVISION':
      return 'En revisión';
    default:
      return estado;
  }
}
