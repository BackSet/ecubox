import { lbsToKg } from '@/lib/utils/weight';

/**
 * Modelo exportable de una cotización de la calculadora pública.
 *
 * Es el único origen de datos para las tres acciones del resultado
 * (copiar, compartir y exportar): se construye con los valores YA
 * calculados y mostrados en pantalla — aquí no se recalcula ninguna
 * tarifa ni total. Centraliza moneda, unidades, decimales y labels
 * para que las tres salidas muestren exactamente lo mismo.
 */
export interface CotizacionCalculadora {
  /** Momento de generación, mostrado en el documento exportado. */
  generadaEn: Date;
  pesoLbs: number;
  pesoKg: number;
  /** Tarifa vigente por libra (USD). */
  tarifaPorLibra: number;
  /** Peso × tarifa, tal como se mostró en pantalla. */
  subtotal: number;
  /** Recargo por envío menor al umbral; null cuando no aplica. */
  recargoMenorPeso: number | null;
  /** Umbral en lbs bajo el cual aplica el recargo. */
  umbralRecargoLbs: number;
  /** Total estimado mostrado en pantalla. */
  total: number;
  moneda: 'USD';
  /** Notas reales que acompañan al resultado en la página. */
  notas: string[];
}

/** Nota referencial que la página ya muestra junto al total. */
export const NOTA_REFERENCIAL =
  'Este valor es referencial. El costo final puede variar según embalaje, dimensiones y revisión aduanal.';

export function fmtLbs(n: number): string {
  return n.toLocaleString('es-EC', { maximumFractionDigits: 2 });
}

export function fmtMoneda(n: number): string {
  return n.toLocaleString('es-EC', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export interface CrearCotizacionParams {
  pesoLbs: number;
  tarifaPorLibra: number;
  /** Subtotal ya calculado en la página (peso × tarifa). */
  subtotal: number;
  /** Recargo ya aplicado en la página; null/0 si no aplica. */
  recargoMenorPeso: number | null;
  umbralRecargoLbs: number;
  /** Total ya calculado en la página. */
  total: number;
  /** Inyectable para tests; default: ahora. */
  generadaEn?: Date;
}

/**
 * Función pura: estructura los valores ya calculados por la página en el
 * modelo exportable. No aplica fórmulas.
 */
export function crearCotizacion(params: CrearCotizacionParams): CotizacionCalculadora {
  return {
    generadaEn: params.generadaEn ?? new Date(),
    pesoLbs: params.pesoLbs,
    pesoKg: lbsToKg(params.pesoLbs),
    tarifaPorLibra: params.tarifaPorLibra,
    subtotal: params.subtotal,
    recargoMenorPeso:
      params.recargoMenorPeso != null && params.recargoMenorPeso > 0
        ? params.recargoMenorPeso
        : null,
    umbralRecargoLbs: params.umbralRecargoLbs,
    total: params.total,
    moneda: 'USD',
    notas: [NOTA_REFERENCIAL],
  };
}

/**
 * Texto plano de la cotización (mismo contenido para copiar y para el
 * fallback de compartir). Conserva el formato que ya usaba la acción
 * de copiar de la página.
 */
export function cotizacionATexto(c: CotizacionCalculadora): string {
  const lineas = [
    'Cotización ECUBOX',
    `Peso: ${fmtLbs(c.pesoLbs)} lbs (${fmtLbs(c.pesoKg)} kg)`,
    `Tarifa: ${fmtMoneda(c.tarifaPorLibra)} / lbs`,
    `Subtotal: ${fmtMoneda(c.subtotal)}`,
    c.recargoMenorPeso != null
      ? `Recargo (< ${c.umbralRecargoLbs} lbs): ${fmtMoneda(c.recargoMenorPeso)}`
      : null,
    `Total: ${fmtMoneda(c.total)}`,
  ].filter(Boolean);
  return lineas.join('\n');
}

/**
 * Nombre de archivo seguro siguiendo el patrón de exportación de rastreo
 * (`prefijo-base-YYYYMMDD.ext`).
 */
export function buildCotizacionFilename(extension: string, fecha: Date = new Date()): string {
  const yyyy = fecha.getFullYear();
  const mm = String(fecha.getMonth() + 1).padStart(2, '0');
  const dd = String(fecha.getDate()).padStart(2, '0');
  return `cotizacion-ecubox-${yyyy}${mm}${dd}.${extension}`;
}
