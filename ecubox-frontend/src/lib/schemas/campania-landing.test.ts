import { describe, expect, it } from 'vitest';
import {
  campaniaBorradorSchema,
  campaniaPublicacionSchema,
  requisitosPendientesPublicacion,
} from './campania-landing';

const min = { nombreInterno: 'Promo', tipo: 'OFERTA' as const };

function borrador(extra: Record<string, unknown> = {}) {
  return campaniaBorradorSchema.safeParse({ ...min, ...extra });
}
function publicacion(extra: Record<string, unknown> = {}) {
  return campaniaPublicacionSchema.safeParse({ ...min, ...extra });
}

describe('campania-landing schemas', () => {
  describe('borrador (incompleto permitido)', () => {
    it('acepta el mínimo (nombre + tipo)', () => {
      expect(borrador().success).toBe(true);
    });
    it('acepta CTA parcial e imagen sin alt', () => {
      expect(borrador({ textoCta: 'Ver', imagenUrlClaro: 'https://x/a.png' }).success).toBe(true);
    });
    it('exige nombre interno', () => {
      expect(campaniaBorradorSchema.safeParse({ tipo: 'OFERTA', nombreInterno: '' }).success).toBe(false);
    });
    it('bloquea esquemas peligrosos también en borrador', () => {
      expect(borrador({ urlCta: 'javascript:alert(1)' }).success).toBe(false);
      expect(borrador({ imagenUrlOscuro: 'data:image/png;base64,AAA' }).success).toBe(false);
    });
    it('exige fechas coherentes', () => {
      expect(borrador({ fechaInicio: '2026-02-01T00:00', fechaFin: '2026-01-01T00:00' }).success).toBe(false);
    });
  });

  describe('publicación (completa)', () => {
    it('exige título', () => {
      expect(publicacion().success).toBe(false);
      expect(publicacion({ titulo: 'Hola' }).success).toBe(true);
    });
    it('CTA debe estar completo o vacío', () => {
      expect(publicacion({ titulo: 'T', urlCta: 'https://x.com' }).success).toBe(false);
      expect(publicacion({ titulo: 'T', textoCta: 'Ver', urlCta: 'https://x.com', tipoDestinoCta: 'EXTERNO' }).success).toBe(true);
    });
    it('imágenes requieren HTTPS y alt', () => {
      expect(publicacion({ titulo: 'T', imagenUrlClaro: 'https://x/a.png' }).success).toBe(false); // sin alt
      expect(publicacion({ titulo: 'T', imagenUrlClaro: 'http://x/a.png', textoAlternativoImagen: 'a' }).success).toBe(false);
      expect(publicacion({ titulo: 'T', imagenUrlOscuro: 'https://x/a.png', textoAlternativoImagen: 'a' }).success).toBe(true);
    });
  });

  describe('requisitosPendientesPublicacion (derivados del schema)', () => {
    it('lista el título cuando falta', () => {
      const pend = requisitosPendientesPublicacion(min);
      expect(pend.some((m) => /título/i.test(m))).toBe(true);
    });
    it('vacío cuando la campaña es publicable', () => {
      expect(requisitosPendientesPublicacion({ ...min, titulo: 'Listo' })).toEqual([]);
    });
  });
});
