import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GuiasMasterPage } from './GuiasMasterPage';
import type { GuiaMaster } from '@/types/guia-master';

function g(over: Partial<GuiaMaster> & { id: number; trackingBase: string; estadoGlobal: GuiaMaster['estadoGlobal'] }): GuiaMaster {
  return {
    totalPiezasEsperadas: 3,
    piezasRegistradas: 0,
    piezasRecibidas: 0,
    piezasDespachadas: 0,
    consignatarioNombre: 'Cons',
    clienteUsuarioNombre: 'cliente',
    createdAt: '2026-06-01T10:00:00',
    ...over,
  };
}

const dataByBandeja = vi.hoisted(() => ({
  // operativas incluye una guía PENDIENTE "intrusa" para probar la defensa.
  operativas: [] as GuiaMaster[],
  pendientes: [] as GuiaMaster[],
  revision: [] as GuiaMaster[],
}));

const conteos = vi.hoisted(() => ({ value: {} as Record<string, number> }));
const authState = vi.hoisted(() => ({ permisos: new Set<string>() }));
const noopMutation = vi.hoisted(() => () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false, variables: undefined }));

vi.mock('@/hooks/useGuiasMaster', () => ({
  useDashboardGuiasMaster: () => ({ data: { conteosPorEstado: conteos.value } }),
  useGuiasMasterPaginadas: (params: { bandeja: 'operativas' | 'pendientes' | 'revision' }) => {
    const content = dataByBandeja[params.bandeja] ?? [];
    return {
      data: { content, totalElements: content.length, totalPages: 1 },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  useCrearGuiaMaster: noopMutation,
  useActualizarGuiaMaster: noopMutation,
  useEliminarGuiaMaster: noopMutation,
  useCancelarGuiaMaster: noopMutation,
  useSalirGuiaMasterDeRevision: noopMutation,
  useAllGuiasMaster: () => ({ data: [] }),
  useAplicarAccionBulkGuiasMaster: noopMutation,
  useAprobarGuiaMaster: noopMutation,
  useMarcarGuiaMasterEnRevision: noopMutation,
  useGuiaMasterHistorial: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { hasPermission: (c: string) => boolean }) => unknown) =>
    selector({ hasPermission: (c: string) => authState.permisos.has(c) }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <GuiasMasterPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  dataByBandeja.operativas = [
    g({ id: 1, trackingBase: 'OP-1', estadoGlobal: 'RECEPCION_PARCIAL' }),
    // Intrusa: estado de otra bandeja; la defensa NO debe renderizarla.
    g({ id: 99, trackingBase: 'INTRUSA-PEND', estadoGlobal: 'PENDIENTE_VERIFICACION' }),
  ];
  dataByBandeja.pendientes = [
    g({ id: 2, trackingBase: 'PEND-1', estadoGlobal: 'PENDIENTE_VERIFICACION' }),
    g({ id: 3, trackingBase: 'PEND-2', estadoGlobal: 'PENDIENTE_VERIFICACION', piezasRegistradas: 2 }),
  ];
  dataByBandeja.revision = [
    g({ id: 4, trackingBase: 'REV-1', estadoGlobal: 'EN_REVISION', revisionMotivo: 'DATOS_INCONSISTENTES: revisar', revisionEn: '2026-06-10T10:00:00' }),
  ];
  conteos.value = {
    SIN_PAQUETES_REGISTRADOS: 1,
    DESPACHO_PARCIAL: 2,
    EN_REVISION: 3,
    PENDIENTE_VERIFICACION: 4,
  };
  authState.permisos = new Set(['GUIAS_MASTER_READ', 'GUIAS_MASTER_CREATE', 'GUIAS_MASTER_UPDATE', 'GUIAS_MASTER_DELETE']);
});
afterEach(cleanup);

describe('GuiasMasterPage · bandejas', () => {
  it('renderiza las tres bandejas con contadores', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Operativas/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Pendientes/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /En revisión/ })).toBeInTheDocument();
    // Contador de revisión = 3 (del dashboard).
    expect(screen.getByRole('tab', { name: /En revisión\s*3/ })).toBeInTheDocument();
  });

  it('la defensa no renderiza filas de otra bandeja (PENDIENTE en Operativas)', () => {
    renderPage();
    expect(screen.getAllByText('OP-1').length).toBeGreaterThan(0);
    expect(screen.queryByText('INTRUSA-PEND')).not.toBeInTheDocument();
  });

  it('separa EN_REVISION de "En despacho" en los KPIs operativos', () => {
    renderPage();
    // En despacho cuenta solo DESPACHO_PARCIAL (2); el valor con el bug sería 5
    // (2 + 3 EN_REVISION). El valor del KPI se renderiza con title.
    expect(screen.getByText('En despacho')).toBeInTheDocument();
    expect(screen.getByTitle('2')).toBeInTheDocument();
    expect(screen.queryByTitle('5')).not.toBeInTheDocument();
  });

  it('en Pendientes muestra el copy breve (en el subtítulo) y oculta filas operativas', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Pendientes/ }));
    // El copy contextual vive integrado como subtítulo del toolbar, no como bloque flotante.
    expect(
      screen.getByText(/Revisa la información del cliente antes de habilitar la guía\./),
    ).toBeInTheDocument();
    expect(screen.getAllByText('PEND-1').length).toBeGreaterThan(0);
    expect(screen.queryByText('OP-1')).not.toBeInTheDocument();
  });

  it('marca la inconsistencia por fila en Pendientes', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Pendientes/ }));
    expect(screen.getAllByText(/Requiere revisión/i).length).toBeGreaterThan(0);
  });

  it('abre el diálogo de aprobación desde Pendientes', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Pendientes/ }));
    fireEvent.click(screen.getAllByRole('button', { name: /^aprobar$/i })[0]);
    expect(screen.getByText('Aprobar guía master')).toBeInTheDocument();
    expect(
      screen.getByText(/La guía quedará habilitada para la operación/i),
    ).toBeInTheDocument();
  });

  it('en En revisión muestra el copy y el motivo parseado', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /En revisión/ }));
    expect(screen.getByText('Guías pausadas temporalmente mientras se valida su información.')).toBeInTheDocument();
    expect(screen.getAllByText(/Datos inconsistentes: revisar/i).length).toBeGreaterThan(0);
  });

  it('respeta permisos: sin GUIAS_MASTER_UPDATE no muestra Aprobar ni Aplicar acción', () => {
    authState.permisos = new Set(['GUIAS_MASTER_READ']);
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Pendientes/ }));
    expect(screen.queryByRole('button', { name: /^aprobar$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /aplicar acción/i })).not.toBeInTheDocument();
  });
});
