import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConsignatarioListPage } from './ConsignatarioListPage';

const navigateMock = vi.hoisted(() => vi.fn());

const consignatariosCliente = [
  {
    id: 5,
    nombre: 'María López',
    telefono: '0991234567',
    direccion: 'Av. Siempre Viva 123',
    provincia: 'Pichincha',
    canton: 'Quito',
    codigo: 'ECU-5',
    clienteUsuarioId: 1,
    totalGuias: 3,
    totalPaquetes: 7,
  },
];

vi.mock('@/hooks/useConsignatarios', () => ({
  useConsignatarios: () => ({
    data: consignatariosCliente,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useDeleteConsignatario: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useOperarioDespachos', () => ({
  useConsignatariosOperario: () => ({
    data: undefined,
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useClientesOperario: () => ({ data: [] }),
  useAsignarConsignatariosClienteOperario: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteConsignatarioOperario: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

// Cliente puro: sin CONSIGNATARIOS_OPERARIO, con permiso de lectura/creación.
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: (p: string) => p !== 'CONSIGNATARIOS_OPERARIO' }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

afterEach(() => {
  cleanup();
  navigateMock.mockReset();
});

describe('ConsignatarioListPage · vista cliente (Mis destinatarios)', () => {
  it('usa el lenguaje de cliente "Mis destinatarios"', () => {
    render(<ConsignatarioListPage />);
    expect(screen.getByRole('heading', { name: 'Mis destinatarios' })).toBeInTheDocument();
    expect(screen.getByText('¿Cómo funcionan los destinatarios?')).toBeInTheDocument();
  });

  it('muestra los conteos de guías y paquetes', () => {
    render(<ConsignatarioListPage />);
    expect(screen.getByText('3 guías')).toBeInTheDocument();
    expect(screen.getByText('7 paquetes')).toBeInTheDocument();
  });

  it('"Ver envíos" navega a /mis-guias filtrado por el destinatario', async () => {
    const user = userEvent.setup();
    render(<ConsignatarioListPage />);
    await user.click(screen.getByRole('button', { name: /ver envíos/i }));
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/mis-guias',
      search: { destinatarioId: 5 },
    });
  });
});
