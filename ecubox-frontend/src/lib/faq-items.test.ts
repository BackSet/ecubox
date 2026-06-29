import { describe, expect, it } from 'vitest';
import { FAQ_ITEMS } from './faq-items';
import { buildFaqJsonLd } from './seo';

describe('FAQ pública · destinatarios', () => {
  it('incluye las preguntas sobre varios destinatarios', () => {
    const preguntas = FAQ_ITEMS.map((i) => i.q);
    expect(preguntas).toContain('¿Puedo enviar a varias personas con la misma cuenta?');
    expect(preguntas).toContain('¿Un destinatario puede ser una oficina o sucursal?');
    expect(preguntas).toContain('¿Puedo usar la misma cuenta para compras personales y de mi negocio?');
    expect(preguntas).toContain('¿Qué pasa si cambio la dirección de un destinatario?');
  });

  it('la respuesta sobre cambio de dirección promete conservación histórica (snapshots confirmados)', () => {
    const item = FAQ_ITEMS.find((i) => i.q === '¿Qué pasa si cambio la dirección de un destinatario?');
    expect(item?.a).toMatch(/futuros/i);
    expect(item?.a).toMatch(/conservan los datos/i);
  });

  it('buildFaqJsonLd produce un FAQPage en sincronía con las preguntas', () => {
    const jsonLd = buildFaqJsonLd(FAQ_ITEMS) as Record<string, unknown>;
    const payload = jsonLd['script:ld+json'] as {
      '@type': string;
      mainEntity: { name: string }[];
    };
    expect(payload['@type']).toBe('FAQPage');
    expect(payload.mainEntity).toHaveLength(FAQ_ITEMS.length);
    expect(payload.mainEntity[0]!.name).toBe(FAQ_ITEMS[0]!.q);
  });
});
