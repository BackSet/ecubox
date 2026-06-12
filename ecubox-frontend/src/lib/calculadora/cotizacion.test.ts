import { describe, expect, it } from 'vitest';
import {
  buildCotizacionFilename,
  cotizacionATexto,
  crearCotizacion,
  fmtMoneda,
} from './cotizacion';

const base = {
  pesoLbs: 2.5,
  tarifaPorLibra: 4.25,
  subtotal: 10.63,
  recargoMenorPeso: 3.5,
  umbralRecargoLbs: 4,
  total: 14.13,
  generadaEn: new Date(2026, 5, 12, 10, 30),
};

describe('crearCotizacion', () => {
  it('estructura los valores ya calculados sin recalcular', () => {
    const c = crearCotizacion(base);
    expect(c.subtotal).toBe(10.63);
    expect(c.total).toBe(14.13);
    expect(c.tarifaPorLibra).toBe(4.25);
    expect(c.recargoMenorPeso).toBe(3.5);
    expect(c.moneda).toBe('USD');
    expect(c.pesoKg).toBeCloseTo(1.13, 1);
    expect(c.notas).toHaveLength(1);
    expect(c.notas[0]).toContain('referencial');
  });

  it('normaliza el recargo a null cuando no aplica', () => {
    expect(crearCotizacion({ ...base, recargoMenorPeso: null }).recargoMenorPeso).toBeNull();
    expect(crearCotizacion({ ...base, recargoMenorPeso: 0 }).recargoMenorPeso).toBeNull();
  });
});

describe('cotizacionATexto', () => {
  it('incluye peso, tarifa, subtotal, recargo y total con la misma moneda', () => {
    const texto = cotizacionATexto(crearCotizacion(base));
    expect(texto).toContain('Cotización ECUBOX');
    expect(texto).toContain('2,5 lbs');
    expect(texto).toContain(`Tarifa: ${fmtMoneda(4.25)} / lbs`);
    expect(texto).toContain(`Subtotal: ${fmtMoneda(10.63)}`);
    expect(texto).toContain(`Recargo (< 4 lbs): ${fmtMoneda(3.5)}`);
    expect(texto).toContain(`Total: ${fmtMoneda(14.13)}`);
    expect(texto).not.toContain('undefined');
    expect(texto).not.toContain('null');
  });

  it('omite la línea de recargo cuando no aplica', () => {
    const texto = cotizacionATexto(crearCotizacion({ ...base, recargoMenorPeso: null }));
    expect(texto).not.toContain('Recargo');
    expect(texto).toContain(`Total: ${fmtMoneda(14.13)}`);
  });
});

describe('buildCotizacionFilename', () => {
  it('genera un nombre seguro con la fecha (patrón de exportación de rastreo)', () => {
    expect(buildCotizacionFilename('pdf', new Date(2026, 5, 12))).toBe(
      'cotizacion-ecubox-20260612.pdf',
    );
  });
});
