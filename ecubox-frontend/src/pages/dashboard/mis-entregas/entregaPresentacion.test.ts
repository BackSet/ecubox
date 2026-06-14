import { describe, expect, it } from 'vitest';
import {
  buildEntregaHaystack,
  modalidadLabel,
  modalidadLabelCorta,
} from './entregaPresentacion';
import type { MiDespacho } from '@/types/mis-despacho';

const base: MiDespacho = {
  despachoId: 123,
  numeroGuia: 'DSP-123',
  fecha: '2026-06-01T10:00:00',
  tipoEntrega: 'DOMICILIO',
  destinoNombre: 'Ana Pérez',
  operadorEntregaNombre: 'Servientrega',
  totalPiezas: 2,
  pesoLbsTotal: 18.4,
  pesoKgTotal: 8.35,
  confirmable: true,
  entregaConfirmada: false,
  piezas: [
    { paqueteId: 1, numeroGuia: 'PKG-AAA', confirmable: true },
    { paqueteId: 2, numeroGuia: 'PKG-BBB', confirmable: true },
  ],
};

describe('modalidad en lenguaje cliente', () => {
  it('traduce los enums técnicos a etiquetas de cliente', () => {
    expect(modalidadLabel('DOMICILIO')).toBe('Entrega a domicilio');
    expect(modalidadLabel('AGENCIA')).toBe('Retiro en oficina');
    expect(modalidadLabel('AGENCIA_COURIER_ENTREGA')).toBe('Retiro en punto de entrega');
  });

  it('nunca muestra "Agencia" aislada ni el enum técnico', () => {
    expect(modalidadLabel('AGENCIA')).not.toBe('Agencia');
    expect(modalidadLabel('AGENCIA')).not.toContain('AGENCIA');
    expect(modalidadLabelCorta('AGENCIA')).toBe('En oficina');
  });

  it('tiene fallback seguro cuando falta la modalidad', () => {
    expect(modalidadLabel(null)).toBe('Modalidad por confirmar');
  });
});

describe('buildEntregaHaystack', () => {
  it('incluye guía de la entrega, guías de paquetes, destino, operador, modalidad e ID', () => {
    const hay = buildEntregaHaystack(base);
    expect(hay).toContain('dsp-123');
    expect(hay).toContain('pkg-aaa');
    expect(hay).toContain('pkg-bbb');
    expect(hay).toContain('ana pérez');
    expect(hay).toContain('servientrega');
    expect(hay).toContain('entrega a domicilio');
    expect(hay).toContain('123');
  });
});
