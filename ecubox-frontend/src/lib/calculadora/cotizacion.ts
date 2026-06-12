export const COTIZACION_AVISO =
  'Este valor es referencial. El costo final puede variar según embalaje, dimensiones y revisión aduanal.';

export interface CotizacionCalculadora {
  pesoLbs: number;
  pesoKg: number;
  tarifaPorLibra: number;
  subtotal: number;
  recargo: number;
  umbralRecargoLbs: number;
  total: number;
  moneda: 'USD';
  aviso: string;
}

export function formatLbs(value: number): string {
  return value.toLocaleString('es-EC', { maximumFractionDigits: 2 });
}

export function formatUsd(value: number): string {
  return value.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function buildCotizacionText(cotizacion: CotizacionCalculadora): string {
  return [
    'Cotización ECUBOX',
    `Peso ingresado: ${formatLbs(cotizacion.pesoLbs)} lbs`,
    `Equivalencia: ${formatLbs(cotizacion.pesoKg)} kg`,
    `Tarifa: ${formatUsd(cotizacion.tarifaPorLibra)} / libra`,
    `Cálculo base: ${formatLbs(cotizacion.pesoLbs)} lbs × ${formatUsd(cotizacion.tarifaPorLibra)}/lbs`,
    `Subtotal: ${formatUsd(cotizacion.subtotal)}`,
    cotizacion.recargo > 0
      ? `Recargo por envío menor a ${formatLbs(cotizacion.umbralRecargoLbs)} lbs: ${formatUsd(cotizacion.recargo)}`
      : null,
    `Total estimado: ${formatUsd(cotizacion.total)}`,
    `Moneda: ${cotizacion.moneda}`,
    `Aviso: ${cotizacion.aviso}`,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}
