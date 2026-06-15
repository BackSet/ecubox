import { describe, expect, it } from 'vitest';
import { despachoKpi } from './EstadisticasPage';
import type { DisponibilidadDespacho, MetricaComparable } from '@/types/estadisticas';

function metrica(over: Partial<MetricaComparable> = {}): MetricaComparable {
  return { actual: 0, anterior: 0, diferencia: 0, variacionPct: null, comparacionDisponible: false, ...over };
}
function disp(over: Partial<DisponibilidadDespacho> = {}): DisponibilidadDespacho {
  return { estado: 'COMPLETA', coberturaDesde: null, coberturaHasta: null, advertencia: null, ...over };
}
const fmt = (v: number | null | undefined) => (v == null ? '—' : String(v));

describe('despachoKpi', () => {
  it('cero REAL (COMPLETA, 0): muestra 0 y "Sin actividad registrada en el periodo"', () => {
    const r = despachoKpi(metrica({ actual: 0, comparacionDisponible: false }), disp({ estado: 'COMPLETA' }), fmt);
    expect(r.value).toBe('0');
    expect(r.hint).toBe('Sin actividad registrada en el periodo');
  });

  it('SIN_CONFIGURACION: muestra "—" y la advertencia de configuración', () => {
    const r = despachoKpi(
      metrica(),
      disp({ estado: 'SIN_CONFIGURACION', advertencia: 'Configura el hito de despacho para calcular esta métrica' }),
      fmt,
    );
    expect(r.value).toBe('—');
    expect(r.hint).toMatch(/configura el hito/i);
  });

  it('SIN_HISTORIAL: muestra "—" y advertencia de historial', () => {
    const r = despachoKpi(
      metrica(),
      disp({ estado: 'SIN_HISTORIAL', advertencia: 'No hay historial suficiente para este periodo' }),
      fmt,
    );
    expect(r.value).toBe('—');
    expect(r.hint).toMatch(/historial/i);
  });

  it('PARCIAL: muestra el valor y "Datos disponibles desde …"', () => {
    const r = despachoKpi(
      metrica({ actual: 11, comparacionDisponible: false }),
      disp({ estado: 'PARCIAL', advertencia: 'Datos disponibles desde 9 mar 2026' }),
      fmt,
    );
    expect(r.value).toBe('11');
    expect(r.hint).toMatch(/disponibles desde/i);
  });

  it('COMPLETA con actividad y comparación: muestra el valor y la variación', () => {
    const r = despachoKpi(
      metrica({ actual: 25, anterior: 12, variacionPct: 50, comparacionDisponible: true }),
      disp({ estado: 'COMPLETA' }),
      fmt,
    );
    expect(r.value).toBe('25');
    expect(r.hint).toMatch(/vs\. periodo anterior/i);
  });
});
