import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ContenidoDestacadoPanel } from './ContenidoDestacadoPanel';
import type { CampaniaLanding } from '@/types/campania-landing';

const crearMock = vi.hoisted(() => vi.fn());
const actualizarMock = vi.hoisted(() => vi.fn());
const publicarMock = vi.hoisted(() => vi.fn());
const desactivarMock = vi.hoisted(() => vi.fn());
const eliminarMock = vi.hoisted(() => vi.fn());

let lista: CampaniaLanding[] = [];

vi.mock('@/hooks/useCampaniasLanding', () => ({
  useCampaniasLanding: () => ({ data: lista, isLoading: false }),
  useCampaniaLandingPublic: () => ({ data: undefined }),
  useCrearCampania: () => ({ mutateAsync: crearMock, isPending: false }),
  useActualizarCampania: () => ({ mutateAsync: actualizarMock, isPending: false }),
  usePublicarCampania: () => ({ mutateAsync: publicarMock, isPending: false }),
  useDesactivarCampania: () => ({ mutateAsync: desactivarMock, isPending: false }),
  useEliminarCampania: () => ({ mutateAsync: eliminarMock, isPending: false }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: () => true }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const publicada: CampaniaLanding = {
  id: 1,
  codigo: 'CAM-000001',
  nombreInterno: 'Promo verano',
  estado: 'PUBLICADA',
  vigencia: 'VIGENTE',
  tipo: 'OFERTA',
  titulo: 'Envíos con descuento',
  actualizadaAt: '2026-06-10T10:00:00',
};

beforeEach(() => {
  lista = [];
  crearMock.mockReset().mockResolvedValue({ id: 5 });
  actualizarMock.mockReset().mockResolvedValue({ id: 1 });
  publicarMock.mockReset().mockResolvedValue({ id: 5 });
  desactivarMock.mockReset().mockResolvedValue({ id: 1 });
  eliminarMock.mockReset().mockResolvedValue(undefined);
});
afterEach(cleanup);

describe('ContenidoDestacadoPanel', () => {
  it('lista las campañas con su estado y vigencia', () => {
    lista = [publicada];
    render(<ContenidoDestacadoPanel />);
    expect(screen.getByText('Promo verano')).toBeInTheDocument();
    expect(screen.getByText('CAM-000001')).toBeInTheDocument();
    expect(screen.getByText('Publicada')).toBeInTheDocument();
    expect(screen.getByText('Vigente')).toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay campañas', () => {
    render(<ContenidoDestacadoPanel />);
    expect(screen.getByText('Aún no hay campañas')).toBeInTheDocument();
  });

  it('abre el editor en "Nueva campaña" y alterna el tema de la vista previa', () => {
    render(<ContenidoDestacadoPanel />);
    fireEvent.click(screen.getAllByRole('button', { name: /nueva campaña/i })[0]);
    expect(screen.getByRole('heading', { name: 'Nueva campaña' })).toBeInTheDocument();

    const preview = screen.getByTestId('campania-preview');
    expect(preview.className).not.toContain('dark');
    fireEvent.click(screen.getByRole('button', { name: /oscuro/i }));
    expect(screen.getByTestId('campania-preview').className).toContain('dark');
  });

  it('la vista previa real refleja el título escrito', () => {
    render(<ContenidoDestacadoPanel />);
    fireEvent.click(screen.getAllByRole('button', { name: /nueva campaña/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('Ej: 20% de descuento en envíos'), {
      target: { value: 'Mi oferta' },
    });
    const preview = screen.getByTestId('campania-preview');
    expect(within(preview).getByRole('heading', { name: 'Mi oferta' })).toBeInTheDocument();
  });

  it('Guardar borrador crea la campaña', async () => {
    render(<ContenidoDestacadoPanel />);
    fireEvent.click(screen.getAllByRole('button', { name: /nueva campaña/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('Ej: Promo Día de la Madre'), {
      target: { value: 'Campaña X' },
    });
    fireEvent.click(screen.getByRole('button', { name: /guardar borrador/i }));
    await waitFor(() => expect(crearMock).toHaveBeenCalledTimes(1));
    expect(crearMock.mock.calls[0][0].nombreInterno).toBe('Campaña X');
  });

  it('Publicar exige título y luego publica', async () => {
    render(<ContenidoDestacadoPanel />);
    fireEvent.click(screen.getAllByRole('button', { name: /nueva campaña/i })[0]);
    fireEvent.change(screen.getByPlaceholderText('Ej: Promo Día de la Madre'), {
      target: { value: 'Campaña Y' },
    });
    fireEvent.change(screen.getByPlaceholderText('Ej: 20% de descuento en envíos'), {
      target: { value: 'Título publicable' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^publicar$/i }));
    await waitFor(() => expect(publicarMock).toHaveBeenCalledWith(5));
    expect(crearMock).toHaveBeenCalledTimes(1);
  });

  it('Desactivar una publicada pide confirmación y llama al endpoint', async () => {
    lista = [publicada];
    render(<ContenidoDestacadoPanel />);
    fireEvent.click(screen.getByRole('button', { name: /desactivar/i }));
    // Confirmación
    const confirmar = await screen.findByRole('button', { name: /^desactivar$/i });
    fireEvent.click(confirmar);
    await waitFor(() => expect(desactivarMock).toHaveBeenCalledWith(1));
  });
});
