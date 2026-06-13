import { describe, expect, it } from 'vitest';
import type { EstadoGuiaMaster } from '@/types/guia-master';
import {
  ESTADO_GUIA_MASTER_CATALOGO,
  GUIA_MASTER_ESTADO_ORDEN,
  MI_GUIA_ESTADO_LABELS,
  GUIA_MASTER_ESTADO_LABELS,
  describirEstadoCliente,
} from './guiaMasterEstados';

/** Lista canónica de estados (debe coincidir con el enum del backend, V107). */
const TODOS_LOS_ESTADOS: EstadoGuiaMaster[] = [
  'PENDIENTE_VERIFICACION',
  'VERIFICADA',
  'EN_REVISION',
  'SIN_PAQUETES_REGISTRADOS',
  'CON_PAQUETES_REGISTRADOS',
  'ENVIO_PARCIAL',
  'ENVIO_COMPLETO',
  'RECEPCION_PARCIAL',
  'RECEPCION_COMPLETA',
  'DESPACHO_PARCIAL',
  'DESPACHO_COMPLETADO',
  'CANCELADA',
];

// Términos internos que NUNCA deben aparecer en copy del cliente.
const TERMINOS_INTERNOS = [
  'guía master',
  'guia master',
  'envío consolidado',
  'envio consolidado',
  'consolidado',
  'lote de recepción',
  'estado derivado',
  'recálculo',
  'operario',
  'parcial',
  'completo',
];

describe('catálogo de estados de guía master', () => {
  it('es exhaustivo: todos los estados del enum tienen traducción', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      const def = ESTADO_GUIA_MASTER_CATALOGO[estado];
      expect(def, `falta la definición de ${estado}`).toBeDefined();
      expect(def.etiquetaInterna.length).toBeGreaterThan(0);
      expect(def.etiquetaInternaCorta.length).toBeGreaterThan(0);
      expect(def.descripcionInterna.length).toBeGreaterThan(0);
      expect(def.etiquetaCliente.length).toBeGreaterThan(0);
      expect(def.etiquetaClienteCorta.length).toBeGreaterThan(0);
      expect(def.descripcionCliente.length).toBeGreaterThan(0);
    }
  });

  it('no tiene estados sin traducción ni claves extra', () => {
    const claves = Object.keys(ESTADO_GUIA_MASTER_CATALOGO).sort();
    expect(claves).toEqual([...TODOS_LOS_ESTADOS].sort());
  });

  it('el orden incluye todos los estados (sin duplicados)', () => {
    expect([...GUIA_MASTER_ESTADO_ORDEN].sort()).toEqual([...TODOS_LOS_ESTADOS].sort());
    expect(new Set(GUIA_MASTER_ESTADO_ORDEN).size).toBe(GUIA_MASTER_ESTADO_ORDEN.length);
  });

  it('conserva las etiquetas internas (administración)', () => {
    expect(GUIA_MASTER_ESTADO_LABELS.ENVIO_PARCIAL).toBe('Envío parcial');
    expect(GUIA_MASTER_ESTADO_LABELS.ENVIO_COMPLETO).toBe('Envío completo');
    expect(GUIA_MASTER_ESTADO_LABELS.VERIFICADA).toBe('Verificada');
  });

  it('usa las etiquetas cliente confirmadas', () => {
    expect(MI_GUIA_ESTADO_LABELS.VERIFICADA).toBe('Guía verificada');
    expect(MI_GUIA_ESTADO_LABELS.CON_PAQUETES_REGISTRADOS).toBe('En preparación');
    expect(MI_GUIA_ESTADO_LABELS.ENVIO_PARCIAL).toBe('En camino a Ecuador');
    expect(MI_GUIA_ESTADO_LABELS.RECEPCION_COMPLETA).toBe('En bodega');
    expect(MI_GUIA_ESTADO_LABELS.DESPACHO_PARCIAL).toBe('En camino al destino');
    expect(MI_GUIA_ESTADO_LABELS.DESPACHO_COMPLETADO).toBe('Entregada');
  });
});

describe('parcial y completo comparten etiqueta cliente', () => {
  it('envío parcial/completo → "En camino a Ecuador"', () => {
    expect(MI_GUIA_ESTADO_LABELS.ENVIO_PARCIAL).toBe(MI_GUIA_ESTADO_LABELS.ENVIO_COMPLETO);
  });

  it('recepción parcial/completa → "En bodega"', () => {
    expect(MI_GUIA_ESTADO_LABELS.RECEPCION_PARCIAL).toBe(
      MI_GUIA_ESTADO_LABELS.RECEPCION_COMPLETA,
    );
  });

  it('las etiquetas cliente no contienen la palabra "parcial"', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      expect(ESTADO_GUIA_MASTER_CATALOGO[estado].etiquetaCliente.toLowerCase()).not.toContain(
        'parcial',
      );
      expect(
        ESTADO_GUIA_MASTER_CATALOGO[estado].etiquetaClienteCorta.toLowerCase(),
      ).not.toContain('parcial');
    }
  });

  it('las descripciones internas de parcial/completo son distintas', () => {
    expect(ESTADO_GUIA_MASTER_CATALOGO.ENVIO_PARCIAL.descripcionInterna).not.toBe(
      ESTADO_GUIA_MASTER_CATALOGO.ENVIO_COMPLETO.descripcionInterna,
    );
    expect(ESTADO_GUIA_MASTER_CATALOGO.RECEPCION_PARCIAL.descripcionInterna).not.toBe(
      ESTADO_GUIA_MASTER_CATALOGO.RECEPCION_COMPLETA.descripcionInterna,
    );
  });
});

describe('ausencia de términos internos en copy del cliente', () => {
  it('ninguna etiqueta/descripción cliente contiene jerga interna', () => {
    for (const estado of TODOS_LOS_ESTADOS) {
      const def = ESTADO_GUIA_MASTER_CATALOGO[estado];
      const copy = `${def.etiquetaCliente} ${def.etiquetaClienteCorta} ${def.descripcionCliente}`.toLowerCase();
      for (const termino of TERMINOS_INTERNOS) {
        expect(copy, `"${termino}" no debe aparecer en copy de ${estado}`).not.toContain(
          termino,
        );
      }
    }
  });
});

describe('descripciones cliente con parcialidad por cantidades', () => {
  it('genera el conteo "X de N" cuando hay datos (recepción parcial)', () => {
    expect(
      describirEstadoCliente('RECEPCION_PARCIAL', { totalEsperado: 3, recibidos: 2 }),
    ).toBe('2 de 3 paquetes de tu guía ya llegaron a nuestra bodega en Ecuador.');
  });

  it('genera el conteo "X de N" cuando hay datos (despacho parcial)', () => {
    expect(
      describirEstadoCliente('DESPACHO_PARCIAL', { totalEsperado: 5, despachados: 1 }),
    ).toBe('1 de 5 paquetes de tu guía ya salieron hacia el lugar de entrega o retiro.');
  });

  it('usa el respaldo sin números cuando faltan conteos', () => {
    expect(describirEstadoCliente('RECEPCION_PARCIAL')).toBe(
      ESTADO_GUIA_MASTER_CATALOGO.RECEPCION_PARCIAL.descripcionCliente,
    );
    expect(describirEstadoCliente('RECEPCION_PARCIAL').toLowerCase()).toContain('algunos');
  });

  it('no inventa cantidades: si el parcial iguala o supera el total, usa el respaldo', () => {
    expect(
      describirEstadoCliente('RECEPCION_PARCIAL', { totalEsperado: 3, recibidos: 3 }),
    ).toBe(ESTADO_GUIA_MASTER_CATALOGO.RECEPCION_PARCIAL.descripcionCliente);
    expect(
      describirEstadoCliente('DESPACHO_PARCIAL', { totalEsperado: null, despachados: 2 }),
    ).toBe(ESTADO_GUIA_MASTER_CATALOGO.DESPACHO_PARCIAL.descripcionCliente);
  });

  it('"En camino a Ecuador" no usa conteo (no existe conteo de enviados)', () => {
    expect(
      describirEstadoCliente('ENVIO_PARCIAL', { totalEsperado: 3, registrados: 2 }),
    ).toBe(ESTADO_GUIA_MASTER_CATALOGO.ENVIO_PARCIAL.descripcionCliente);
  });

  it('los estados no parciales devuelven su descripción fija', () => {
    expect(describirEstadoCliente('DESPACHO_COMPLETADO', { totalEsperado: 3, despachados: 3 })).toBe(
      'Todos los paquetes de tu guía fueron despachados o entregados.',
    );
    expect(describirEstadoCliente('CANCELADA')).toBe(
      'La guía fue cancelada y no continuará el proceso.',
    );
  });
});
