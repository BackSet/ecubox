import { describe, expect, it } from 'vitest';
import {
  COTIZACION_AVISO,
  buildCotizacionText,
  type CotizacionCalculadora,
} from './cotizacion';

function buildCotizacion(overrides: Partial<CotizacionCalculadora> = {}): CotizacionCalculadora {
  return {
    pesoLbs: 3,
    pesoKg: 1.36,
    tarifaPorLibra: 5,
    subtotal: 15,
    recargo: 3.5,
    umbralRecargoLbs: 4,
    total: 18.5,
    moneda: 'USD',
    aviso: COTIZACION_AVISO,
    ...overrides,
  };
}

describe('buildCotizacionText', () => {
  it('incluye toda la cotización y su aviso', () => {
    const text = buildCotizacionText(buildCotizacion());

    expect(text).toContain('Peso ingresado: 3 lbs');
    expect(text).toContain('Equivalencia: 1,36 kg');
    expect(text).toContain('Tarifa:');
    expect(text).toContain('Cálculo base:');
    expect(text).toContain('Subtotal:');
    expect(text).toContain('Recargo por envío menor a 4 lbs:');
    expect(text).toContain('Total estimado:');
    expect(text).toContain('Moneda: USD');
    expect(text).toContain(`Aviso: ${COTIZACION_AVISO}`);
  });

  it('omite el recargo cuando no aplica sin perder el resto del desglose', () => {
    const text = buildCotizacionText(
      buildCotizacion({ pesoLbs: 5, pesoKg: 2.27, subtotal: 25, recargo: 0, total: 25 }),
    );

    expect(text).not.toContain('Recargo por envío');
    expect(text).toContain('Subtotal:');
    expect(text).toContain('Total estimado:');
    expect(text).toContain('Moneda: USD');
  });
});
