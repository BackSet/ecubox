import { describe, expect, it } from 'vitest';
import { computePiezaDisplay } from './trackingDisplayUtils';
import type { TrackingResponse } from '@/lib/api/tracking.service';

function pieza(actualId: number, afterEstadoId?: number): TrackingResponse {
  return {
    numeroGuia: 'DEMO',
    estadoActualId: actualId,
    estados: [
      { id: 1, codigo: 'BASE_A', nombre: 'Base A', orden: 1, tipoFlujo: 'NORMAL', leyenda: null, esActual: actualId === 1 },
      { id: 9, codigo: 'ALT', nombre: 'Alterno', orden: 9, tipoFlujo: 'ALTERNO', afterEstadoId, leyenda: null, esActual: actualId === 9 },
      { id: 2, codigo: 'BASE_B', nombre: 'Base B', orden: 2, tipoFlujo: 'NORMAL', leyenda: null, esActual: actualId === 2 },
    ],
  };
}

describe('computePiezaDisplay', () => {
  it('cuenta únicamente estados base', () => {
    const display = computePiezaDisplay(pieza(2));
    expect(display.totalPasosBase).toBe(2);
    expect(display.pasoBaseActual).toBe(2);
    expect(display.progresoDeterminado).toBe(true);
  });

  it('conserva el último paso base cuando el actual es alterno', () => {
    const display = computePiezaDisplay(pieza(9, 1));
    expect(display.totalPasosBase).toBe(2);
    expect(display.pasoBaseActual).toBe(1);
    expect(display.progresoDeterminado).toBe(true);
  });

  it('no inventa porcentaje si el alterno no tiene ancla resoluble', () => {
    const display = computePiezaDisplay(pieza(9));
    expect(display.pasoBaseActual).toBe(0);
    expect(display.progresoDeterminado).toBe(false);
  });
});
