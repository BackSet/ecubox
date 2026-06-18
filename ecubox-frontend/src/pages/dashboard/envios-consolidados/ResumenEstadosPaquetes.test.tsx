import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResumenEstadosPaquetes } from './ResumenEstadosPaquetes';
import type { ResumenEstadosPaquetesConsolidado } from '@/types/envio-consolidado';

const mockNavigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

describe('ResumenEstadosPaquetes', () => {
  afterEach(() => {
    cleanup();
    mockNavigate.mockReset();
  });

  it('renders 0 packages when summary is empty or missing', () => {
    render(<ResumenEstadosPaquetes consolidadoId={1} />);
    expect(screen.getByText('0 paquetes')).toBeInTheDocument();
  });

  it('renders visible badges (up to 2) and attention label', () => {
    const resumen: ResumenEstadosPaquetesConsolidado = {
      totalPaquetes: 12,
      estados: [
        {
          estadoId: 1,
          nombre: 'En bodega',
          cantidad: 9,
          requiereAtencion: false,
          tipoFlujo: 'NORMAL',
        },
        {
          estadoId: 2,
          nombre: 'En tránsito',
          cantidad: 2,
          requiereAtencion: false,
          tipoFlujo: 'NORMAL',
        },
        {
          estadoId: 3,
          nombre: 'Retenido aduana',
          cantidad: 1,
          requiereAtencion: true,
          tipoFlujo: 'ALTERNO',
        },
      ],
      cantidadRequiereAtencion: 1,
      estadosMixtos: true,
    };

    render(<ResumenEstadosPaquetes consolidadoId={1} resumen={resumen} />);

    // Total count
    expect(screen.getByText('12 paquetes')).toBeInTheDocument();

    // visible badges (9 En bodega, 2 En tránsito)
    expect(screen.getByText('9 En bodega')).toBeInTheDocument();
    expect(screen.getByText('2 En tránsito')).toBeInTheDocument();

    // Rest count (+1)
    expect(screen.getByText('+1')).toBeInTheDocument();

    // Attention alert
    expect(screen.getByText('1 requiere atención')).toBeInTheDocument();
  });

  it('opens popover on click and triggers navigation on Ver packages click', async () => {
    const user = userEvent.setup();
    const resumen: ResumenEstadosPaquetesConsolidado = {
      totalPaquetes: 5,
      estados: [
        {
          estadoId: 1,
          nombre: 'En bodega',
          cantidad: 3,
          requiereAtencion: false,
          tipoFlujo: 'NORMAL',
        },
        {
          estadoId: null,
          nombre: 'Sin estado',
          cantidad: 2,
          requiereAtencion: true,
          tipoFlujo: null,
        },
      ],
      cantidadRequiereAtencion: 2,
      estadosMixtos: true,
    };

    render(<ResumenEstadosPaquetes consolidadoId={10} resumen={resumen} />);

    // Click trigger to open popover
    const trigger = screen.getByRole('button', { name: /Ver resumen de estados/ });
    await user.click(trigger);

    // Popover content visible
    expect(screen.getByText('Desglose de estados')).toBeInTheDocument();
    expect(screen.getByText('5 total')).toBeInTheDocument();

    // "Sin estado" visible
    expect(screen.getByText('Sin estado')).toBeInTheDocument();

    // Click "Ver" on first option (En bodega - ID 1)
    const verButtons = screen.getAllByRole('button', { name: 'Ver' });
    await user.click(verButtons[0]!);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/envios-consolidados/$id',
      params: { id: '10' },
      search: { estadoPaqueteId: 1 },
    });

    // Click trigger to open popover again
    await user.click(trigger);

    // Click "Ver" on null option (Sin estado)
    const verButtons2 = screen.getAllByRole('button', { name: 'Ver' });
    await user.click(verButtons2[1]!);

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/envios-consolidados/$id',
      params: { id: '10' },
      search: { estadoPaqueteId: 'SIN_ESTADO' },
    });
  });
});
