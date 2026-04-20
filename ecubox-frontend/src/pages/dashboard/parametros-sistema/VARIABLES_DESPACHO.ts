/**
 * Variables disponibles para la plantilla del mensaje WhatsApp de despacho.
 * Clave = placeholder en el texto ({{numeroGuia}}), label = nombre legible en la UI.
 */

export const VARIABLES_DESPACHO_GROUPS = [
  {
    category: 'Guía y operación',
    items: [
      { key: 'numeroGuia', label: 'Nº guía' },
      { key: 'observaciones', label: 'Observaciones' },
      { key: 'codigoPrecinto', label: 'Código precinto' },
    ],
  },
  {
    category: 'Consignatario y red',
    items: [
      { key: 'consignatarioNombre', label: 'Consignatario' },
      { key: 'courierEntregaNombre', label: 'Courier de entrega' },
      { key: 'agenciaNombre', label: 'Agencia' },
    ],
  },
  {
    category: 'Sacas y carga',
    items: [
      { key: 'cantidadSacas', label: 'Cantidad de sacas' },
      { key: 'totalPaquetes', label: 'Total paquetes' },
      { key: 'numerosSaca', label: 'Números de saca' },
      { key: 'paquetesPorSaca', label: 'Paquetes por saca' },
    ],
  },
] as const;

/** Lista plana para sustitución en preview y tipos. */
export const VARIABLES_DESPACHO = VARIABLES_DESPACHO_GROUPS.flatMap((g) => [...g.items]);

export type VariableDespachoKey = (typeof VARIABLES_DESPACHO)[number]['key'];

/** Valores de ejemplo para la vista previa (reemplazo de variables en preview). */
export const VARIABLES_PREVIEW: Record<VariableDespachoKey, string> = {
  numeroGuia: 'ECB-12345',
  consignatarioNombre: 'Juan Pérez',
  courierEntregaNombre: 'Envíos Express',
  agenciaNombre: 'Agencia Centro',
  observaciones: 'Fragil',
  codigoPrecinto: 'PRC-001',
  cantidadSacas: '3',
  totalPaquetes: '10',
  numerosSaca: 'S-001, S-002, S-003',
  paquetesPorSaca: '3, 4, 3',
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
