import { describe, expect, it } from 'vitest';
import {
  despachoCreateSchema,
  parseGuiaList,
  validateBulkPeso,
  liquidacionCrearSchema,
  guiaCancelarSchema,
  MAX_BULK_PESO_ITEMS,
  MAX_GUIAS_BULK,
  MAX_MOTIVO,
  MAX_NOTAS,
} from './schemas';

describe('despachoCreateSchema', () => {
  const base = {
    numeroGuia: 'GU-001',
    courierEntregaId: 1,
    tipoEntrega: 'DOMICILIO' as const,
    consignatarioId: 5,
    observaciones: '',
    codigoPrecinto: '',
    sacaIds: [],
  };

  it('acepta domicilio con consignatario', () => {
    expect(() => despachoCreateSchema.parse(base)).not.toThrow();
  });

  it('rechaza domicilio sin consignatario', () => {
    const r = despachoCreateSchema.safeParse({ ...base, consignatarioId: undefined });
    expect(r.success).toBe(false);
  });

  it('rechiza agencia sin agenciaId', () => {
    const r = despachoCreateSchema.safeParse({
      ...base,
      tipoEntrega: 'AGENCIA',
      consignatarioId: undefined,
      agenciaId: undefined,
    });
    expect(r.success).toBe(false);
  });
});

describe('parseGuiaList', () => {
  it('parsea y deduplica guías', () => {
    const r = parseGuiaList('GU-1\nGU-2\nGU-1');
    expect(r.guias).toEqual(['GU-1', 'GU-2']);
    expect(r.duplicates).toContain('GU-1');
  });

  it('rechaza más de 500 guías', () => {
    const text = Array.from({ length: MAX_GUIAS_BULK + 1 }, (_, i) => `G${i}`).join('\n');
    const r = parseGuiaList(text);
    expect(r.errors.length).toBeGreaterThan(0);
  });
});

describe('validateBulkPeso', () => {
  it('acepta items con peso positivo', () => {
    const r = validateBulkPeso([{ id: 1, pesoLbs: 5 }]);
    expect(r.ok).toBe(true);
  });

  it('rechaza más de 100 items', () => {
    const items = Array.from({ length: MAX_BULK_PESO_ITEMS + 1 }, (_, i) => ({
      id: i,
      pesoKg: 1,
    }));
    const r = validateBulkPeso(items);
    expect(r.ok).toBe(false);
  });
});

describe('liquidacionCrearSchema', () => {
  it('acepta notas hasta 4000 caracteres', () => {
    const notas = 'a'.repeat(MAX_NOTAS);
    expect(() =>
      liquidacionCrearSchema.parse({
        fechaDocumento: '2026-01-01',
        periodoDesde: '',
        periodoHasta: '',
        notas,
      })
    ).not.toThrow();
  });

  it('rechaza periodo invertido', () => {
    const r = liquidacionCrearSchema.safeParse({
      fechaDocumento: '2026-01-01',
      periodoDesde: '2026-02-01',
      periodoHasta: '2026-01-01',
      notas: '',
    });
    expect(r.success).toBe(false);
  });
});

describe('guiaCancelarSchema', () => {
  it('rechaza motivo mayor a 500', () => {
    const r = guiaCancelarSchema.safeParse({ motivo: 'x'.repeat(MAX_MOTIVO + 1) });
    expect(r.success).toBe(false);
  });
});
