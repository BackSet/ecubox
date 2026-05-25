/**
 * Variables disponibles para la plantilla del mensaje WhatsApp de despacho.
 * Clave = placeholder en el texto ({{numeroGuia}}), label = nombre legible en la UI.
 *
 * Obsoletas (no usar; migradas en BD): destinatarioNombre, distribuidorNombre.
 */

export const VARIABLES_DESPACHO_GROUPS = [
  {
    category: 'Guía y operación',
    items: [
      { key: 'numeroGuia', label: 'Nº guía' },
      { key: 'fechaDespacho', label: 'Fecha del despacho' },
      { key: 'tipoEntregaEtiqueta', label: 'Tipo de entrega' },
      { key: 'observaciones', label: 'Observaciones' },
      { key: 'codigoPrecinto', label: 'Código precinto' },
    ],
  },
  {
    category: 'Consignatario',
    items: [
      { key: 'consignatarioNombre', label: 'Consignatario' },
      { key: 'consignatarioTelefono', label: 'Teléfono' },
      { key: 'consignatarioDireccion', label: 'Dirección' },
    ],
  },
  {
    category: 'Red y destino',
    items: [
      { key: 'courierEntregaNombre', label: 'Courier de entrega' },
      { key: 'agenciaNombre', label: 'Agencia aliada' },
      { key: 'agenciaCourierEntregaNombre', label: 'Punto de entrega' },
      { key: 'destinoNombre', label: 'Destino (según tipo)' },
    ],
  },
  {
    category: 'Sacas y carga',
    items: [
      { key: 'cantidadSacas', label: 'Cantidad de sacas' },
      { key: 'totalPaquetes', label: 'Total paquetes' },
      { key: 'numerosSaca', label: 'Números de saca' },
      { key: 'paquetesPorSaca', label: 'Paquetes por saca' },
      { key: 'pesoTotalLbs', label: 'Peso total (lbs)' },
      { key: 'pesoTotalKg', label: 'Peso total (kg)' },
    ],
  },
] as const;

/** Lista plana para sustitución en preview y tipos. */
export const VARIABLES_DESPACHO = VARIABLES_DESPACHO_GROUPS.flatMap((g) => [...g.items]);

export type VariableDespachoKey = (typeof VARIABLES_DESPACHO)[number]['key'];

/** Valores de ejemplo para la vista previa (reemplazo de variables en preview). */
export const VARIABLES_PREVIEW: Record<VariableDespachoKey, string> = {
  numeroGuia: 'ECB-12345',
  fechaDespacho: '25/05/2026 14:30',
  tipoEntregaEtiqueta: 'Domicilio',
  observaciones: 'Frágil',
  codigoPrecinto: 'PRC-001',
  consignatarioNombre: 'Juan Pérez',
  consignatarioTelefono: '+593 99 123 4567',
  consignatarioDireccion: 'Av. Principal 123, Quito',
  courierEntregaNombre: 'Envíos Express',
  agenciaNombre: 'Agencia Centro',
  agenciaCourierEntregaNombre: 'Pichincha, Quito (UIO-01)',
  destinoNombre: 'Juan Pérez',
  cantidadSacas: '3',
  totalPaquetes: '10',
  numerosSaca: 'S-001, S-002, S-003',
  paquetesPorSaca: '3, 4, 3',
  pesoTotalLbs: '22.50',
  pesoTotalKg: '10.21',
};

export function formatVariable(key: VariableDespachoKey): string {
  return `{{${key}}}`;
}

/** Reemplaza todas las variables de la plantilla por valores de ejemplo para la preview. */
export function plantillaToPreviewText(plantilla: string): string {
  let out = plantilla;
  for (const { key } of VARIABLES_DESPACHO) {
    const placeholder = formatVariable(key);
    const example = VARIABLES_PREVIEW[key];
    out = out.split(placeholder).join(example);
  }
  return out;
}
