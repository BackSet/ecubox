import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaqueteListPage } from './PaqueteListPage';
import type { Paquete } from '@/types/paquete';

function paq(over: Partial<Paquete> & { id: number }): Paquete {
  return {
    numeroGuia: `G-${over.id}`,
    ref: `REF-${over.id}`,
    estadoRastreoCodigo: 'REGISTRADO',
    estadoRastreoNombre: 'Registrado',
    estadoRastreoTipoFlujo: 'NORMAL',
    consignatarioNombre: 'Cons',
    contenido: 'algo',
    ...over,
  } as Paquete;
}

const dataByBandeja = vi.hoisted(() => ({
  todos: [] as Paquete[],
  operativos: [] as Paquete[],
  en_revision: [] as Paquete[],
}));
const resumenState = vi.hoisted(() => ({
  bandejas: { todos: 10, operativos: 7, enRevision: 3 },
  total: 10,
}));
const authState = vi.hoisted(() => ({ permisos: new Set<string>() }));

vi.mock('@/hooks/usePaquetes', () => ({
  usePaqueteResumen: () => ({
    data: {
      total: resumenState.total,
      conPeso: 4,
      sinPeso: 6,
      vencidos: 0,
      consignatariosDistintos: 2,
      chips: { todos: 10, sinPeso: 6, conPeso: 4, sinGuiaMaster: 1, vencidos: 0 },
      bandejas: resumenState.bandejas,
      estados: [],
      consignatarios: [],
      codigosEnvio: [],
      guiasMaster: [],
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  usePaquetesPaginated: (params: { bandeja: 'todos' | 'operativos' | 'en_revision' }) => {
    const content = dataByBandeja[params.bandeja] ?? [];
    return {
      data: { content, totalElements: content.length, totalPages: 1 },
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
  },
  useDeletePaquete: () => ({ mutateAsync: vi.fn().mockResolvedValue({}), isPending: false }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { hasPermission: (c: string) => boolean }) => unknown) =>
    selector({ hasPermission: (c: string) => authState.permisos.has(c) }),
}));

const routerStore = vi.hoisted(() => {
  const state = { bandeja: undefined as string | undefined };
  const listeners = new Set<() => void>();
  return {
    get: () => state.bandeja,
    set: (b?: string) => { state.bandeja = b; listeners.forEach((l) => l()); },
    subscribe: (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; },
  };
});

// Router mock URL-driven: el re-render por navegación lo provee un suscriptor en useRouterState.
vi.mock('@tanstack/react-router', async () => {
  const React = await import('react');
  return {
    useNavigate: () => (opts: { search?: unknown }) => {
      const next = typeof opts?.search === 'function'
        ? (opts.search as (p: Record<string, unknown>) => { bandeja?: string })({ bandeja: routerStore.get() })
        : (opts?.search as { bandeja?: string } | undefined);
      routerStore.set(next?.bandeja);
    },
    useRouterState: ({ select }: { select: (s: { location: { search: Record<string, unknown> } }) => unknown }) => {
      const [, force] = React.useState(0);
      React.useEffect(() => routerStore.subscribe(() => force((n) => n + 1)), []);
      return select({ location: { search: { bandeja: routerStore.get() } } });
    },
  };
});

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <PaqueteListPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  dataByBandeja.todos = [paq({ id: 1, ref: 'REF-TODOS' })];
  dataByBandeja.operativos = [paq({ id: 2, ref: 'REF-OPER' })];
  dataByBandeja.en_revision = [
    paq({
      id: 3,
      ref: 'REF-REV',
      revisionActiva: {
        id: 9, paqueteId: 3, estado: 'EN_REVISION', motivo: 'DATOS_INCONSISTENTES',
        fechaInicio: '2026-06-10T10:00:00', iniciadoPorUsername: 'operario1',
      } as Paquete['revisionActiva'],
    }),
  ];
  resumenState.bandejas = { todos: 10, operativos: 7, enRevision: 3 };
  resumenState.total = 10;
  authState.permisos = new Set(['PAQUETES_READ', 'PAQUETES_REVISION_READ']);
  routerStore.set(undefined);
});
afterEach(cleanup);

describe('PaqueteListPage · bandejas', () => {
  it('muestra las tres bandejas en orden Operativos, Todos, En revisión con contadores', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual([
      expect.stringContaining('Operativos'),
      expect.stringContaining('Todos'),
      expect.stringContaining('En revisión'),
    ]);
    expect(screen.getByRole('tab', { name: /Operativos\s*7/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Todos\s*10/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /En revisión\s*3/ })).toBeInTheDocument();
  });

  it('por defecto está en "Operativos" (sin parámetro en la URL) y muestra su título', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /Operativos/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Paquetes operativos')).toBeInTheDocument();
    expect(screen.getByText('REF-OPER')).toBeInTheDocument();
    expect(routerStore.get()).toBeUndefined();
  });

  it('al cambiar de bandeja (URL) muestra sus datos y oculta los anteriores', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /Todos/ }));
    expect(routerStore.get()).toBe('todos');
    expect(screen.getByText('Todos los paquetes')).toBeInTheDocument();
    expect(screen.getByText('REF-TODOS')).toBeInTheDocument();
    expect(screen.queryByText('REF-OPER')).not.toBeInTheDocument();
  });

  it('En revisión muestra columnas específicas, ayuda y datos de revisión', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /En revisión/ }));
    expect(screen.getByText('Paquetes en revisión')).toBeInTheDocument();
    expect(screen.getByText('La revisión no modifica su estado logístico.')).toBeInTheDocument();
    // Columnas propias de la bandeja de revisión.
    const tabla = screen.getByRole('table');
    expect(within(tabla).getByText('Motivo')).toBeInTheDocument();
    expect(within(tabla).getByText('Inicio')).toBeInTheDocument();
    expect(within(tabla).getByText('Iniciado por')).toBeInTheDocument();
    expect(within(tabla).getByText('operario1')).toBeInTheDocument();
  });

  it('oculta la bandeja En revisión sin PAQUETES_REVISION_READ', () => {
    authState.permisos = new Set(['PAQUETES_READ']);
    renderPage();
    expect(screen.queryByRole('tab', { name: /En revisión/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });
});
