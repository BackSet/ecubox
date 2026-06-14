import type { MiDespachoDetalle } from '@/types/mis-despacho';

/**
 * Fuente única (sin dependencias de UI) de las etiquetas de modalidad de
 * entrega en lenguaje cliente. La consume tanto la capa de presentación
 * (`pages/dashboard/mis-entregas/entregaPresentacion`) como los exportadores
 * PDF/XLSX, para no duplicar mapas de tipos.
 *
 * Nunca se exponen los enums técnicos (`DOMICILIO`, `AGENCIA`,
 * `AGENCIA_COURIER_ENTREGA`) ni "Agencia" como etiqueta aislada.
 */
export type ModalidadEntrega = 'DOMICILIO' | 'AGENCIA' | 'AGENCIA_COURIER_ENTREGA';

export const MODALIDAD_LABELS: Record<string, string> = {
  DOMICILIO: 'Entrega a domicilio',
  AGENCIA: 'Retiro en oficina',
  AGENCIA_COURIER_ENTREGA: 'Retiro en punto de entrega',
};

/** Texto corto para chips/filtros donde el largo importa. */
export const MODALIDAD_LABELS_CORTAS: Record<string, string> = {
  DOMICILIO: 'A domicilio',
  AGENCIA: 'En oficina',
  AGENCIA_COURIER_ENTREGA: 'En punto de entrega',
};

/** Etiqueta de la modalidad en lenguaje cliente. */
export function modalidadLabel(tipo?: string | null): string {
  if (!tipo) return 'Modalidad por confirmar';
  return MODALIDAD_LABELS[tipo] ?? tipo;
}

export function modalidadLabelCorta(tipo?: string | null): string {
  if (!tipo) return 'Sin modalidad';
  return MODALIDAD_LABELS_CORTAS[tipo] ?? MODALIDAD_LABELS[tipo] ?? tipo;
}

/** Modalidad en lenguaje cliente para exportadores que reciben el detalle. */
export function modalidadLabelDetalle(d: MiDespachoDetalle): string {
  return modalidadLabel(d.tipoEntrega);
}
