import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResumenEstadosPaquetes } from './ResumenEstadosPaquetes';
import type { ResumenEstadosPaquetesConsolidado } from '@/types/envio-consolidado';

const mockNavigate = vi.fn();
const originalMatchMedia = window.matchMedia;

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '1' }),
}));

describe('ResumenEstadosPaquetes', () => {
  afterEach(() => {
    cleanup();
    mockNavigate.mockReset();
    window.matchMedia = originalMatchMedia;
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
          paquetesPreview: [
            {
              paqueteId: 101,
              codigo: 'TBA331923064',
              guiaId: 201,
              guiaCodigo: '420071431319',
              piezaLabel: '1/2',
            },
          ],
          hayMas: true,
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

    // La celda principal sigue compacta: no muestra códigos de paquetes.
    expect(screen.queryByText(/TBA331923064/)).not.toBeInTheDocument();
  });

  it('opens popover with grouped package preview and triggers filtered navigation', async () => {
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
          paquetesPreview: [
            {
              paqueteId: 11,
              codigo: 'TBA331923064',
              guiaId: 22,
              guiaCodigo: '420071431319',
              piezaLabel: '1/3',
            },
            {
              paqueteId: 12,
              codigo: 'CNUSP154283',
              guiaId: null,
              guiaCodigo: null,
            },
          ],
          hayMas: true,
        },
        {
          estadoId: null,
          nombre: 'Sin estado',
          cantidad: 2,
          requiereAtencion: true,
          tipoFlujo: null,
          paquetesPreview: [
            {
              paqueteId: 21,
              codigo: 'SIN-ESTADO-001',
              guiaId: 31,
              guiaCodigo: 'GUIA-SIN-ESTADO',
            },
          ],
          hayMas: false,
        },
      ],
      cantidadRequiereAtencion: 2,
      estadosMixtos: true,
    };

    render(<ResumenEstadosPaquetes consolidadoId={10} resumen={resumen} />);

    // Click trigger to open popover
    const trigger = screen.getByRole('button', { name: /Ver desglose de estados/ });
    await user.click(trigger);

    // Popover content visible
    expect(screen.getByText('Desglose de estados')).toBeInTheDocument();
    expect(screen.getByText('5 total')).toBeInTheDocument();
    expect(screen.getByText('En bodega · 3 paquetes')).toBeInTheDocument();
    expect(screen.getByText(/TBA331923064/)).toBeInTheDocument();
    expect(screen.getByText(/Guía 420071431319/)).toBeInTheDocument();
    expect(screen.getByText(/Pieza 1\/3/)).toBeInTheDocument();

    // "Sin estado" visible
    expect(screen.getByText('Sin estado · 2 paquetes')).toBeInTheDocument();

    // Click "Ver" on first option (En bodega - ID 1)
    await user.click(screen.getByRole('button', { name: /Ver paquetes de En bodega/ }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/envios-consolidados/$id',
      params: { id: '10' },
      search: { estadoPaqueteId: 1 },
    });

    // Click trigger to open popover again
    await user.click(trigger);

    // Click "Ver" on null option (Sin estado)
    await user.click(screen.getByRole('button', { name: /Ver paquetes de Sin estado/ }));

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/envios-consolidados/$id',
      params: { id: '10' },
      search: { sinEstado: true },
    });
  });

  it('uses a dialog on mobile and closes with Escape', async () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    const user = userEvent.setup();
    const resumen: ResumenEstadosPaquetesConsolidado = {
      totalPaquetes: 1,
      estados: [
        {
          estadoId: 1,
          nombre: 'En bodega',
          cantidad: 1,
          requiereAtencion: false,
          tipoFlujo: 'NORMAL',
          paquetesPreview: [{ paqueteId: 1, codigo: 'PKG-1' }],
          hayMas: false,
        },
      ],
      cantidadRequiereAtencion: 0,
      estadosMixtos: false,
    };

    render(<ResumenEstadosPaquetes consolidadoId={10} resumen={resumen} />);

    await user.click(screen.getByRole('button', { name: /Ver desglose de estados/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('En bodega · 1 paquete')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
