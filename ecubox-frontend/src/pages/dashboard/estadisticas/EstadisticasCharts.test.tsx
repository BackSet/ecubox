import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MonthlyChart, StatusDistributionChart } from './EstadisticasCharts';

describe('EstadisticasCharts', () => {
  it('renders monthly operational series with an accessible description', () => {
    render(
      <MonthlyChart
        despachos={[
          { periodo: '2026-06', etiqueta: 'Jun 26', total: 8, paquetes: 20, pesoLbs: 40 },
        ]}
        registros={[
          { periodo: '2026-06', etiqueta: 'Jun 26', total: 12, paquetes: 0, pesoLbs: 0 },
        ]}
      />,
    );

    expect(
      screen.getByRole('img', {
        name: 'Comparación mensual de despachos y paquetes registrados',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText('Despachos')).toBeInTheDocument();
    expect(screen.getByText('Paquetes registrados')).toBeInTheDocument();
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
