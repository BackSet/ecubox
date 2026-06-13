import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SeriesChart, StatusDistributionChart } from './EstadisticasCharts';

describe('EstadisticasCharts', () => {
  it('renders a monthly series with an accessible description', () => {
    render(
      <SeriesChart
        granularidad="MENSUAL"
        paquetesDespachados={[{ periodo: '2026-06', etiqueta: 'Jun 26', total: 8, paquetes: 8, pesoLbs: 40 }]}
        registros={[{ periodo: '2026-06', etiqueta: 'Jun 26', total: 12, paquetes: 0, pesoLbs: 0 }]}
      />,
    );

    expect(
      screen.getByRole('img', {
        name: 'Comparación mensual de paquetes despachados y registrados',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Paquetes despachados')).toBeInTheDocument();
    expect(screen.getByText('Paquetes registrados')).toBeInTheDocument();
    // El KPI/serie de "Despachos" (entidad) ya no se renderiza.
    expect(screen.queryByText('Despachos')).toBeNull();
  });

  it('adapts the accessible label to the granularity', () => {
    render(
      <SeriesChart
        granularidad="DIARIA"
        paquetesDespachados={[{ periodo: '2026-06-13', etiqueta: '13 jun', total: 3, paquetes: 3, pesoLbs: 9 }]}
        registros={[{ periodo: '2026-06-13', etiqueta: '13 jun', total: 4, paquetes: 0, pesoLbs: 0 }]}
      />,
    );

    expect(
      screen.getByRole('img', {
        name: 'Comparación diaria de paquetes despachados y registrados',
      }),
    ).toBeInTheDocument();
  });

  it('shows an explicit empty state when both series are all zero', () => {
    render(
      <SeriesChart
        granularidad="MENSUAL"
        paquetesDespachados={[{ periodo: '2026-06', etiqueta: 'Jun 26', total: 0, paquetes: 0, pesoLbs: 0 }]}
        registros={[{ periodo: '2026-06', etiqueta: 'Jun 26', total: 0, paquetes: 0, pesoLbs: 0 }]}
      />,
    );

    expect(
      screen.getByText('No hubo paquetes registrados ni despachados en este periodo.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows package status totals and percentages', () => {
    render(
      <StatusDistributionChart
        data={[
          { estadoId: 1, codigo: 'REG', nombre: 'Registrado', total: 3 },
          { estadoId: 2, codigo: 'DES', nombre: 'Despachado', total: 1 },
        ]}
      />,
    );

    expect(screen.getByText('Registrado')).toBeInTheDocument();
    expect(screen.getByText('3 · 75%')).toBeInTheDocument();
  });
});
