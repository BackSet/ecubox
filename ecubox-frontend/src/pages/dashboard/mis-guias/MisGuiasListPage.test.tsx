import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MisGuiasListPage } from './MisGuiasListPage';
import { GUIA_TRACKING_MENSAJE_PRINCIPAL } from './guiaTrackingHelpContent';

const misGuiasState = vi.hoisted(() => ({
  data: [] as unknown[],
  isLoading: false,
  isFetching: false,
  error: null as unknown,
  refetch: vi.fn(),
}));

vi.mock('@/hooks/useMisGuias', () => ({
  MIS_GUIAS_QUERY_KEY: ['mis-guias'],
  useMisGuias: () => misGuiasState,
  useEliminarMiGuia: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { hasPermission: () => boolean }) => unknown) =>
    selector({ hasPermission: () => true }),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MisGuiasListPage />
    </QueryClientProvider>,
  );
}

afterEach(cleanup);

describe('MisGuiasListPage · ayuda de número de guía', () => {
  it('muestra la ayuda destacada cuando el cliente aún no tiene guías', () => {
    misGuiasState.data = [];
    renderPage();
    // El detalle incluye el mensaje principal y los ejemplos por tienda.
    expect(screen.getByText(GUIA_TRACKING_MENSAJE_PRINCIPAL)).toBeInTheDocument();
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('SHEIN')).toBeInTheDocument();
    // El estado vacío enlaza la ayuda y conserva "Registrar guías".
    expect(
      screen.getByRole('button', { name: /no sabes cuál número ingresar/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /registrar guías/i }).length).toBeGreaterThan(0);
  });
});
