import { describe, expect, it } from 'vitest';
import { cedulaSchema, emailOpcionalSchema, telefonoSchema } from './validation';

describe('telefonoSchema', () => {
  it('acepta solo dígitos en rango 7-15', () => {
    expect(() => telefonoSchema.parse('0991234567')).not.toThrow();
    expect(() => telefonoSchema.parse('123456789012345')).not.toThrow();
  });

  it('rechaza letras', () => {
    expect(() => telefonoSchema.parse('099abc123')).toThrow();
  });

  it('rechaza menos de 7 dígitos', () => {
    expect(() => telefonoSchema.parse('123456')).toThrow();
  });
});

describe('cedulaSchema', () => {
  it('acepta exactamente 10 dígitos', () => {
    expect(() => cedulaSchema.parse('1710034062')).not.toThrow();
  });

  it('rechaza longitud distinta de 10', () => {
    expect(() => cedulaSchema.parse('171003406')).toThrow();
    expect(() => cedulaSchema.parse('17100340621')).toThrow();
  });
});

describe('emailOpcionalSchema', () => {
  it('acepta undefined y cadena vacía', () => {
    expect(() => emailOpcionalSchema.parse(undefined)).not.toThrow();
    expect(() => emailOpcionalSchema.parse('')).not.toThrow();
    expect(() => emailOpcionalSchema.parse('   ')).not.toThrow();
  });

  it('valida email cuando hay contenido', () => {
    expect(() => emailOpcionalSchema.parse('a@b.co')).not.toThrow();
    expect(() => emailOpcionalSchema.parse('no-es-email')).toThrow();
  });
});
