import { describe, expect, it } from 'vitest';
import { buildEstadisticasPdf } from './estadisticasPdf';
import type {
  DisponibilidadDespacho,
  EstadisticasDashboard,
  MetricaComparable,
} from '@/types/estadisticas';

function m(actual: number | null, comp = false): MetricaComparable {
  return { actual, anterior: 0, diferencia: actual, variacionPct: comp ? 10 : null, comparacionDisponible: comp };
}

function dashboard(disp: DisponibilidadDespacho): EstadisticasDashboard {
  return {
    generadoEn: '2026-06-14T10:00:00',
    granularidad: 'MENSUAL',
    periodoParcial: true,
    periodo: { preset: 'ULTIMOS_12_MESES', desde: '2025-07-01', hastaExclusivo: '2026-06-15', hastaInclusivo: '2026-06-14' },
    periodoAnterior: { preset: 'ULTIMOS_12_MESES', desde: '2024-07-01', hastaExclusivo: '2025-07-01', hastaInclusivo: '2025-06-30' },
    diasMaxSinDespachar: 12,
    resultados: {
      paquetesDespachados: m(11),
      paquetesRegistrados: m(40, true),
      pesoDespachadoLbs: m(68.7),
      tiempoPromedioDespachoDias: m(6),
      margenBruto: m(100),
      costoDistribucion: m(30),
      ingresoNeto: m(70),
      paquetesDespachadosSerie: [{ periodo: '2026-06', etiqueta: 'Jun 26', total: 4, paquetes: 4, pesoLbs: 13.2 }],
      registrosSerie: [{ periodo: '2026-06', etiqueta: 'Jun 26', total: 5, paquetes: 0, pesoLbs: 0 }],
    },
    estadoActual: {
      pendientesDespacho: 6,
      demoradosSinDespachar: 1,
      entregadosSinDespacho: 0,
      excepcionesOperativas: 0,
      distribucion: [],
      paquetesDemorados: [],
      paquetesEntregadosSinDespacho: [],
      excepciones: [],
    },
    disponibilidadDespacho: disp,
  };
}

function disp(over: Partial<DisponibilidadDespacho>): DisponibilidadDespacho {
  return { estado: 'COMPLETA', coberturaDesde: null, coberturaHasta: null, advertencia: null, ...over };
}

describe('buildEstadisticasPdf · disponibilidad', () => {
  it('construye el PDF con cobertura COMPLETA', () => {
    const doc = buildEstadisticasPdf(dashboard(disp({ estado: 'COMPLETA' })));
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });

  it('construye el PDF cuando no hay configuración (despachados como "—")', () => {
    const doc = buildEstadisticasPdf(
      dashboard(disp({ estado: 'SIN_CONFIGURACION', advertencia: 'Configura el hito de despacho para calcular esta métrica' })),
    );
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });

  it('construye el PDF con cobertura PARCIAL (nota de disponibilidad)', () => {
    const doc = buildEstadisticasPdf(
      dashboard(disp({ estado: 'PARCIAL', coberturaDesde: '2026-03-09T00:00:00', advertencia: 'Datos disponibles desde 9 mar 2026' })),
    );
    expect(doc.getNumberOfPages()).toBeGreaterThan(0);
  });
});
