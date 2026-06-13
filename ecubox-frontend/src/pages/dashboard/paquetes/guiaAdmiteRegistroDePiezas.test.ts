import { describe, it, expect } from 'vitest';
import type { GuiaMaster } from '@/types/guia-master';
import { guiaAdmiteRegistroDePiezas } from './PaqueteBulkCreateForm';

type GuiaArg = Parameters<typeof guiaAdmiteRegistroDePiezas>[0];

function guia(overrides: Partial<GuiaArg> = {}): GuiaArg {
  return {
    consignatarioId: 1,
    estadoGlobal: 'SIN_PAQUETES_REGISTRADOS' as GuiaMaster['estadoGlobal'],
    totalPiezasEsperadas: 3,
    piezasRegistradas: 0,
    ...overrides,
  };
}

describe('guiaAdmiteRegistroDePiezas', () => {
  it('admite una guía operativa con consignatario y cupo disponible', () => {
    expect(guiaAdmiteRegistroDePiezas(guia(), { isEditMode: false })).toBe(true);
  });

  it('excluye guías sin consignatario asignado', () => {
    expect(
      guiaAdmiteRegistroDePiezas(guia({ consignatarioId: null }), { isEditMode: false }),
    ).toBe(false);
  });

  it('excluye guías en PENDIENTE_VERIFICACION (creación y edición)', () => {
    const g = guia({ estadoGlobal: 'PENDIENTE_VERIFICACION' });
    expect(guiaAdmiteRegistroDePiezas(g, { isEditMode: false })).toBe(false);
    expect(guiaAdmiteRegistroDePiezas(g, { isEditMode: true })).toBe(false);
  });

  it('excluye guías en EN_REVISION (creación y edición)', () => {
    const g = guia({ estadoGlobal: 'EN_REVISION' });
    expect(guiaAdmiteRegistroDePiezas(g, { isEditMode: false })).toBe(false);
    expect(guiaAdmiteRegistroDePiezas(g, { isEditMode: true })).toBe(false);
  });

  it('excluye guías con cupo completo en creación pero las permite en edición', () => {
    const g = guia({ totalPiezasEsperadas: 2, piezasRegistradas: 2 });
    expect(guiaAdmiteRegistroDePiezas(g, { isEditMode: false })).toBe(false);
    expect(guiaAdmiteRegistroDePiezas(g, { isEditMode: true })).toBe(true);
  });
});
