import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TrackingTimeline } from './TrackingTimeline';

describe('TrackingTimeline', () => {
  it('mantiene pasos base y muestra el alterno configurado con su motivo', () => {
    render(
      <TrackingTimeline
        currentIndex={1}
        estados={[
          {
            id: 10,
            codigo: 'BASE-1',
            nombre: 'Recibido',
            orden: 1,
            tipoFlujo: 'NORMAL',
            leyenda: null,
            esActual: false,
          },
          {
            id: 20,
            codigo: 'ALT',
            nombre: 'Validación requerida',
            orden: 2,
            tipoFlujo: 'ALTERNO',
            afterEstadoId: 10,
            esActual: true,
            leyenda: 'Motivo: documentación pendiente',
            fechaOcurrencia: '2026-06-13T10:00:00',
          },
          {
            id: 30,
            codigo: 'BASE-2',
            nombre: 'Listo',
            orden: 3,
            tipoFlujo: 'NORMAL',
            leyenda: null,
            esActual: false,
          },
        ]}
      />,
    );

    expect(screen.getByText('Paso 1')).toBeInTheDocument();
    expect(screen.getByText('Aviso')).toBeInTheDocument();
    expect(screen.getByText('Motivo: documentación pendiente')).toBeInTheDocument();
    expect(screen.getByText('Paso 2')).toBeInTheDocument();
    expect(screen.getByRole('list')).toBeInTheDocument();
  });
});
