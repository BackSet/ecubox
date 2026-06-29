import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MisEntregasPage } from './MisEntregasPage';
import type { MiDespacho } from '@/types/mis-despacho';

const misDespachosState = vi.hoisted(() => ({
  data: [] as MiDespacho[],
  isLoading: false,
  isFetching: false,
  error: null as unknown,
  refetch: vi.fn(),
}));

const confirmarState = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
  variables: undefined as number | undefined,
}));

const authState = vi.hoisted(() => ({ permisos: new Set<string>() }));

vi.mock('@/hooks/useMisDespachos', () => ({
  useMisDespachos: () => misDespachosState,
  useConfirmarEntrega: () => confirmarState,
  useMiDespacho: () => ({ data: null, isLoading: false, error: null }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { hasPermission: (c: string) => boolean }) => unknown) =>
    selector({ hasPermission: (c: string) => authState.permisos.has(c) }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

function despacho(over: Partial<MiDespacho> = {}): MiDespacho {
  return {
    despachoId: 1,
    numeroGuia: 'DSP-0001',
    fecha: '2026-06-01T10:00:00',
    tipoEntrega: 'DOMICILIO',
    destinoNombre: 'Ana Pérez',
    operadorEntregaNombre: 'Servientrega',
    totalPiezas: 2,
    pesoLbsTotal: 18.4,
    pesoKgTotal: 8.35,
    confirmable: true,
    entregaConfirmada: false,
    piezas: [
      { paqueteId: 11, numeroGuia: 'PKG-AAA', confirmable: true },
      { paqueteId: 12, numeroGuia: 'PKG-BBB', confirmable: true },
    ],
    ...over,
  };
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MisEntregasPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  misDespachosState.data = [];
  misDespachosState.isLoading = false;
  misDespachosState.isFetching = false;
  misDespachosState.error = null;
  confirmarState.isPending = false;
  confirmarState.variables = undefined;
  confirmarState.mutateAsync.mockClear();
  authState.permisos = new Set(['MIS_ENTREGAS_READ', 'MIS_ENTREGAS_CONFIRM', 'MIS_ENTREGAS_EXPORT']);
});

afterEach(cleanup);

describe('MisEntregasPage · listado de cliente', () => {
  it('muestra las columnas de escritorio en lenguaje cliente', () => {
    misDespachosState.data = [despacho()];
    renderPage();
    const columnas = ['Entrega', 'Destino', 'Modalidad', 'Paquetes', 'Estado', 'Acciones'];
    for (const c of columnas) {
      expect(screen.getAllByText(c).length).toBeGreaterThan(0);
    }
  });

  it('expone guía, destino, modalidad cliente, paquetes y peso acotados', () => {
    misDespachosState.data = [despacho()];
    renderPage();
    // Guía visible (en tarjeta y/o tabla).
    expect(screen.getAllByText('DSP-0001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Ana Pérez').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Entrega a domicilio').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2 paquetes').length).toBeGreaterThan(0);
    // ID interno queda secundario, no como identificador principal.
    expect(screen.getAllByText(/Entrega #1\b/).length).toBeGreaterThan(0);
    // Peso del cliente (lbs · kg).
    expect(screen.getAllByText(/lbs/).length).toBeGreaterThan(0);
  });

  it('usa los KPIs en lenguaje cliente (Entregas, Listas para confirmar, Recibidas)', () => {
    misDespachosState.data = [despacho(), despacho({ despachoId: 2, entregaConfirmada: true, confirmable: false })];
    renderPage();
    expect(screen.getByText('Entregas')).toBeInTheDocument();
    expect(screen.getByText('Listas para confirmar')).toBeInTheDocument();
    // "Recibidas" aparece como KPI y como chip de filtro.
    expect(screen.getAllByText('Recibidas').length).toBeGreaterThan(0);
  });

  it('muestra los estados de confirmación con etiquetas de cliente', () => {
    misDespachosState.data = [
      despacho({ despachoId: 1, confirmable: true, entregaConfirmada: false }),
      despacho({ despachoId: 2, confirmable: false, entregaConfirmada: true }),
      despacho({ despachoId: 3, confirmable: false, entregaConfirmada: false }),
    ];
    renderPage();
    expect(screen.getAllByText('Lista para confirmar').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Recibida').length).toBeGreaterThan(0);
    expect(screen.getAllByText('En proceso').length).toBeGreaterThan(0);
  });

  it('filtra por destino al buscar', async () => {
    misDespachosState.data = [
      despacho({ despachoId: 1, numeroGuia: 'DSP-0001', destinoNombre: 'Ana Pérez' }),
      despacho({ despachoId: 2, numeroGuia: 'DSP-0002', destinoNombre: 'Oficina Guayaquil' }),
    ];
    renderPage();
    const input = screen.getByPlaceholderText('Buscar por guía, destino o tipo de entrega...');
    fireEvent.change(input, { target: { value: 'guayaquil' } });
    await waitFor(() => {
      expect(screen.queryByText('DSP-0001')).not.toBeInTheDocument();
    });
    expect(screen.getAllByText('DSP-0002').length).toBeGreaterThan(0);
  });

  it('confirma la entrega al pulsar "Ya lo recibí"', async () => {
    misDespachosState.data = [despacho({ despachoId: 7 })];
    renderPage();
    const botones = screen.getAllByRole('button', { name: /ya lo recib/i });
    fireEvent.click(botones[0]!);
    await waitFor(() => expect(confirmarState.mutateAsync).toHaveBeenCalledWith(7));
  });

  it('muestra el menú de exportaciones agrupado cuando hay permiso', async () => {
    misDespachosState.data = [despacho()];
    renderPage();
    const menus = screen.getAllByRole('button', { name: /más acciones de la entrega/i });
    expect(menus.length).toBeGreaterThan(0);
    await userEvent.click(menus[0]!);
    expect(await screen.findByText('Imprimir')).toBeInTheDocument();
    expect(screen.getByText('Exportar PDF')).toBeInTheDocument();
    expect(screen.getByText('Exportar Excel')).toBeInTheDocument();
  });

  it('respeta permisos: sin confirmar ni exportar oculta esas acciones', () => {
    authState.permisos = new Set(['MIS_ENTREGAS_READ']);
    misDespachosState.data = [despacho()];
    renderPage();
    expect(screen.queryByRole('button', { name: /ya lo recib/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /más acciones de la entrega/i })).not.toBeInTheDocument();
  });

  it('habilita exportar por enlace con ACCESO_ENLACE_MIS_ENTREGAS_EXPORT', () => {
    authState.permisos = new Set(['ACCESO_ENLACE_MIS_ENTREGAS_READ', 'ACCESO_ENLACE_MIS_ENTREGAS_EXPORT']);
    misDespachosState.data = [despacho()];
    renderPage();
    expect(screen.getAllByRole('button', { name: /más acciones de la entrega/i }).length).toBeGreaterThan(0);
  });

  it('renderiza tarjeta móvil y fila de tabla para la misma entrega', () => {
    misDespachosState.data = [despacho()];
    const { container } = renderPage();
    // Contenedor de tarjetas móviles (md:hidden) y tabla (hidden md:block) coexisten.
    expect(container.querySelector('.md\\:hidden')).toBeTruthy();
    // La guía aparece tanto en la tarjeta como en la fila.
    expect(screen.getAllByText('DSP-0001').length).toBe(2);
  });

  it('muestra el estado vacío en lenguaje cliente', () => {
    misDespachosState.data = [];
    renderPage();
    expect(screen.getByText('No tienes entregas en camino')).toBeInTheDocument();
  });

  it('muestra el esqueleto de carga sin estado vacío', () => {
    misDespachosState.isLoading = true;
    renderPage();
    expect(screen.queryByText('No tienes entregas en camino')).not.toBeInTheDocument();
    // Cabeceras de tabla presentes durante la carga.
    expect(screen.getAllByText('Entrega').length).toBeGreaterThan(0);
  });

  it('muestra el estado de error cuando no hay datos', () => {
    misDespachosState.error = new Error('falló');
    misDespachosState.data = [];
    renderPage();
    expect(screen.getByText('No se pudieron cargar tus entregas')).toBeInTheDocument();
  });

  it('mantiene el ID interno como dato secundario "Entrega #N"', () => {
    misDespachosState.data = [despacho()];
    renderPage();
    // El número de guía es el identificador principal...
    expect(screen.getAllByText('DSP-0001').length).toBeGreaterThan(0);
    // ...y el ID interno queda como dato secundario "Entrega #1".
    expect(screen.getAllByText(/Entrega #1\b/).length).toBeGreaterThan(0);
  });
});
