import { describe, expect, it } from 'vitest';
import { campaniaLandingSchema } from './campania-landing';

const ok = {
  nombreInterno: 'Promo',
  tipo: 'OFERTA' as const,
};

function validar(extra: Record<string, unknown>) {
  return campaniaLandingSchema.safeParse({ ...ok, ...extra });
}

describe('campaniaLandingSchema', () => {
  it('acepta el mínimo (nombre + tipo)', () => {
    expect(validar({}).success).toBe(true);
  });

  it('exige nombre interno', () => {
    expect(campaniaLandingSchema.safeParse({ tipo: 'OFERTA', nombreInterno: '' }).success).toBe(false);
  });

  it('CTA todo-o-nada: URL sin texto/destino falla', () => {
    const r = validar({ urlCta: 'https://x.com' });
    expect(r.success).toBe(false);
  });

  it('CTA externo debe ser HTTPS', () => {
    expect(validar({ textoCta: 'Ver', urlCta: 'http://x.com', tipoDestinoCta: 'EXTERNO' }).success).toBe(false);
    expect(validar({ textoCta: 'Ver', urlCta: 'https://x.com', tipoDestinoCta: 'EXTERNO' }).success).toBe(true);
  });

  it('CTA interno debe empezar con «/»', () => {
    expect(validar({ textoCta: 'Ir', urlCta: 'registro', tipoDestinoCta: 'INTERNO' }).success).toBe(false);
    expect(validar({ textoCta: 'Ir', urlCta: '/registro', tipoDestinoCta: 'INTERNO' }).success).toBe(true);
  });

  it('bloquea esquemas javascript: y data:', () => {
    expect(validar({ textoCta: 'X', urlCta: 'javascript:alert(1)', tipoDestinoCta: 'EXTERNO' }).success).toBe(false);
    expect(validar({ imagenUrl: 'data:image/png;base64,AAA', textoAlternativoImagen: 'a' }).success).toBe(false);
  });

  it('imagen requiere HTTPS y alt', () => {
    expect(validar({ imagenUrl: 'https://cdn.x/a.png' }).success).toBe(false); // sin alt
    expect(validar({ imagenUrl: 'http://cdn.x/a.png', textoAlternativoImagen: 'a' }).success).toBe(false); // no https
    expect(validar({ imagenUrl: 'https://cdn.x/a.png', textoAlternativoImagen: 'a' }).success).toBe(true);
  });

  it('fechas: fin debe ser posterior a inicio', () => {
    expect(validar({ fechaInicio: '2026-02-01T00:00', fechaFin: '2026-01-01T00:00' }).success).toBe(false);
    expect(validar({ fechaInicio: '2026-01-01T00:00', fechaFin: '2026-02-01T00:00' }).success).toBe(true);
  });
});
