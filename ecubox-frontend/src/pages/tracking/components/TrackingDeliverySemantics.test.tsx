import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrackingOperadorEntregaCard } from './TrackingOperadorEntregaCard';
import { TrackingProgressCard } from './TrackingProgressCard';

describe('semántica pública de entrega', () => {
  it('muestra retiro en oficina con ubicación y acción diferenciadas', () => {
    render(
      <TrackingOperadorEntregaCard
        result={{
          numeroGuia: 'DEMO',
          operadorEntrega: {
            tipoEntrega: 'AGENCIA',
            agenciaNombre: 'Oficina Norte',
            agenciaDireccion: 'Av. Uno',
            agenciaProvincia: 'Pichincha',
            agenciaCanton: 'Quito',
            horarioAtencionAgencia: '09:00 a 17:00',
            diasMaxRetiroAgencia: 5,
          },
        }}
      />,
    );

    expect(screen.getByText('Retiro en oficina')).toBeInTheDocument();
    expect(screen.getByText('Oficina Norte')).toBeInTheDocument();
    expect(screen.queryByText('Rastreo en la web del courier de entrega')).not.toBeInTheDocument();
  });

  it('muestra plazo, vencimiento y fecha límite', () => {
    render(
      <TrackingProgressCard
        result={{
          numeroGuia: 'DEMO',
          diasMaxRetiro: 5,
          diasTranscurridos: 6,
          diasRestantes: 0,
          paqueteVencido: true,
          fechaLimiteRetiro: '2026-06-12T00:00:00',
        }}
        totalPasosBase={2}
        pasoBaseActual={1}
      />,
    );

    expect(screen.getByText(/venció hace 1 día/)).toBeInTheDocument();
    expect(screen.getByText(/Fecha límite:/)).toBeInTheDocument();
  });

  it('diferencia entrega a domicilio de punto de retiro del courier', () => {
    const { rerender } = render(
      <TrackingOperadorEntregaCard
        result={{
          numeroGuia: 'DEMO-DOMICILIO',
          operadorEntrega: {
            tipoEntrega: 'DOMICILIO',
            courierEntregaNombre: 'Courier Uno',
          },
        }}
      />,
    );

    expect(screen.getByText('Entrega a domicilio')).toBeInTheDocument();

    rerender(
      <TrackingOperadorEntregaCard
        result={{
          numeroGuia: 'DEMO-COURIER',
          operadorEntrega: {
            tipoEntrega: 'AGENCIA_COURIER',
            courierEntregaNombre: 'Courier Uno',
          },
        }}
      />,
    );

    expect(screen.getByText('Punto de retiro del courier')).toBeInTheDocument();
  });
});
