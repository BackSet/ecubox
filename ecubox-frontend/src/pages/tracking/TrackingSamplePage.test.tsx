import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn().mockResolvedValue(undefined);
let searchStr = '';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useNavigate: () => navigate,
  useRouterState: ({ select }: { select: (state: unknown) => unknown }) =>
    select({ location: { searchStr } }),
}));

vi.mock('@/components/public/PublicPageLayout', () => ({
  PublicPageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/components/public/PublicPageHero', () => ({
  PublicPageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/public/PublicSupportStrip', () => ({
  PublicSupportStrip: () => null,
}));
vi.mock('@/pages/tracking/components/TrackingSampleBanner', () => ({
  TrackingSampleBanner: () => null,
}));
vi.mock('@/pages/tracking/components/TrackingResultsSection', () => ({
  TrackingResultsSection: ({ codigo }: { codigo: string }) => (
    <div data-testid="resolved-example">{codigo}</div>
  ),
}));

import { TrackingSamplePage } from './TrackingSamplePage';

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <TrackingSamplePage />
    </QueryClientProvider>,
  );
}

describe('TrackingSamplePage', () => {
  beforeEach(() => {
    navigate.mockClear();
    searchStr = '';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('carga listado, selecciona el primero y resuelve por API', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/examples')) {
        return {
          ok: true,
          json: async () => [
            { codigo: 'DEMO-A', titulo: 'Normal', descripcion: 'Dinámico', tipo: 'PIEZA' },
          ],
        };
      }
      return {
        ok: true,
        json: async () => ({ tipo: 'PIEZA', pieza: { numeroGuia: 'DEMO-A' } }),
      };
    }));

    renderPage();

    expect(await screen.findByText('Normal')).toBeInTheDocument();
    expect(await screen.findByTestId('resolved-example')).toHaveTextContent('DEMO-A');
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({
      to: '/tracking/ejemplo',
      search: { codigo: 'DEMO-A' },
      replace: true,
    }));
  });

  it('conserva la selección recibida por URL', async () => {
    searchStr = '?codigo=DEMO-B';
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/examples')) {
        return {
          ok: true,
          json: async () => [
            { codigo: 'DEMO-A', titulo: 'A', descripcion: 'A', tipo: 'PIEZA' },
            { codigo: 'DEMO-B', titulo: 'B', descripcion: 'B', tipo: 'PIEZA' },
          ],
        };
      }
      return {
        ok: true,
        json: async () => ({ tipo: 'PIEZA', pieza: { numeroGuia: 'DEMO-B' } }),
      };
    }));

    renderPage();

    expect(await screen.findByTestId('resolved-example')).toHaveTextContent('DEMO-B');
    fireEvent.click(screen.getByRole('button', { name: /DEMO-A/ }));
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({
      search: { codigo: 'DEMO-A' },
    }));
  });

  it('muestra estado vacío cuando no existe catálogo público', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    }));

    renderPage();

    expect(await screen.findByText(/no existe un catálogo público activo/i)).toBeInTheDocument();
  });

  it('muestra un estado de carga accesible mientras consulta los ejemplos', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => undefined)));

    const { container } = renderPage();

    expect(screen.getByText('Cargando ejemplos…')).toBeInTheDocument();
    expect(container.querySelector('.md\\:grid-cols-2')).not.toBeInTheDocument();
  });

  it('anuncia el error de la API', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ message: 'Catálogo temporalmente no disponible' }),
    }));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Catálogo temporalmente no disponible',
    );
  });

  it('expone selección accesible y grilla responsiva', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL) => {
      if (String(input).endsWith('/examples')) {
        return {
          ok: true,
          json: async () => [
            { codigo: 'DEMO-A', titulo: 'Normal', descripcion: 'Dinámico', tipo: 'PIEZA' },
          ],
        };
      }
      return {
        ok: true,
        json: async () => ({ tipo: 'PIEZA', pieza: { numeroGuia: 'DEMO-A' } }),
      };
    }));

    const { container } = renderPage();

    const option = await screen.findByRole('button', { name: /DEMO-A/ });
    expect(option).toHaveAttribute('aria-current', 'true');
    expect(container.querySelector('.md\\:grid-cols-2.xl\\:grid-cols-4')).toBeInTheDocument();
  });
});
