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
    etiqueta: 'Oficina',
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

  it('muestra la etiqueta como dato secundario (badge)', () => {
    render(<ConsignatarioListPage />);
    // Aparece en card móvil y fila de escritorio (jsdom no aplica CSS).
    expect(screen.getAllByText('Oficina').length).toBeGreaterThan(0);
  });

  it('muestra los conteos en una sola representación "N guías · N paquetes"', () => {
    render(<ConsignatarioListPage />);
    // Aparece en la card móvil y en la columna de escritorio (jsdom no aplica CSS).
    expect(screen.getAllByText('3 guías · 7 paquetes').length).toBeGreaterThan(0);
  });

  it('"Ver envíos" navega a /mis-guias filtrado por el destinatario', async () => {
    const user = userEvent.setup();
    render(<ConsignatarioListPage />);
    const botones = screen.getAllByRole('button', { name: /ver envíos/i });
    await user.click(botones[0]);
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/mis-guias',
      search: { destinatarioId: 5 },
    });
  });

  it('maneja 0 guías y nombres/ubicaciones largas sin romper el resumen', () => {
    consignatariosCliente[0].totalGuias = 0;
    consignatariosCliente[0].totalPaquetes = 0;
    consignatariosCliente[0].nombre =
      'Centro Logístico y de Distribución Internacional Sucursal Norte de la Ciudad';
    consignatariosCliente[0].direccion =
      'Av. de los Shyris N44-123 y Río Coca, Edificio Metropolitano Torre B, piso 14, oficina 1407, referencia frente al parque';
    render(<ConsignatarioListPage />);
    expect(screen.getAllByText('0 guías · 0 paquetes').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /ver envíos/i }).length).toBeGreaterThan(0);
    // Restauramos para no afectar otros tests.
    consignatariosCliente[0].totalGuias = 3;
    consignatariosCliente[0].totalPaquetes = 7;
    consignatariosCliente[0].nombre = 'María López';
  });
});
