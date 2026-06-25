import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PageResponse } from '@/types/page';
import type { PaqueteElegibleConsolidado } from '@/types/envio-consolidado';
import { CrearEnvioConGuiasDialog } from './CrearEnvioConGuiasDialog';

const crearMock = vi.hoisted(() => vi.fn());
const buscarElegiblesMock = vi.hoisted(() => vi.fn());
const buscarPorGuiasMock = vi.hoisted(() => vi.fn());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/lib/api/paquetes.service', () => ({
  buscarPaquetesPorGuias: (...args: unknown[]) => buscarPorGuiasMock(...args),
}));

vi.mock('@/hooks/useEnviosConsolidados', () => ({
  useCrearEnvioConsolidado: () => ({ mutateAsync: crearMock, isPending: false }),
  // Devuelve datos solo cuando el hook está habilitado (hay término de búsqueda).
  useBuscarPaquetesElegibles: (_params: unknown, enabled: boolean) => ({
    data: enabled ? buscarElegiblesMock() : undefined,
    isFetching: false,
  }),
}));

function elegible(
  id: number,
  numeroGuia: string,
  extra: Partial<PaqueteElegibleConsolidado['paquete']> = {},
): PaqueteElegibleConsolidado {
  return {
    paquete: {
      id,
      numeroGuia,
      consignatarioId: id,
      consignatarioNombre: 'Juan Pérez',
      estadoRastreoNombre: 'Registrado',
      pesoLbs: 5,
      pesoKg: 2.27,
      ...extra,
    },
    elegible: true,
    motivoNoElegible: null,
  };
}

function noElegible(id: number, numeroGuia: string, motivo: string): PaqueteElegibleConsolidado {
  return {
    paquete: {
      id,
      numeroGuia,
      consignatarioId: id,
      consignatarioNombre: 'Ana',
      estadoRastreoNombre: 'En tránsito',
    },
    elegible: false,
    motivoNoElegible: motivo,
  };
}

function page(content: PaqueteElegibleConsolidado[]): PageResponse<PaqueteElegibleConsolidado> {
  return {
    content,
    totalElements: content.length,
    totalPages: 1,
    page: 0,
    size: 20,
    first: true,
    last: true,
  } as PageResponse<PaqueteElegibleConsolidado>;
}

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  });
});

describe('CrearEnvioConGuiasDialog', () => {
  beforeEach(() => {
    crearMock.mockReset();
    crearMock.mockResolvedValue({ envio: { id: 1, totalPaquetes: 1 }, guiasNoEncontradas: [] });
    buscarElegiblesMock.mockReset();
    buscarElegiblesMock.mockReturnValue(page([elegible(10, 'OK 1/1')]));
    buscarPorGuiasMock.mockReset();
    navigateMock.mockReset();
  });
  afterEach(cleanup);

  it('muestra la carga por lista por defecto', () => {
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);
    expect(screen.getByText('Piezas asociadas (opcional)')).toBeInTheDocument();
    // Sin paquetes el botón dice "Crear envío".
    expect(screen.getByRole('button', { name: /Crear envío/i })).toBeInTheDocument();
  });

  it('permite buscar y seleccionar un paquete, reflejándolo en el conteo del botón', async () => {
    const user = userEvent.setup();
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.type(screen.getByPlaceholderText(/Buscar por guía/i), 'OK');

    const fila = await screen.findByRole('button', { name: /OK 1\/1/ });
    await user.click(fila);

    // Aparece en "Paquetes a incluir" y el botón refleja el total real.
    expect(screen.getByText('Paquetes a incluir')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Crear con 1 paquete/i })).toBeInTheDocument();
  });

  it('permite deseleccionar un paquete', async () => {
    const user = userEvent.setup();
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.type(screen.getByPlaceholderText(/Buscar por guía/i), 'OK');
    const fila = await screen.findByRole('button', { name: /OK 1\/1/ });

    await user.click(fila);
    expect(await screen.findByRole('button', { name: /Crear con 1 paquete/i })).toBeInTheDocument();

    await user.click(fila);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Crear envío$/i })).toBeInTheDocument(),
    );
  });

  it('no deja seleccionar un paquete no elegible y muestra el motivo', async () => {
    buscarElegiblesMock.mockReturnValue(
      page([noElegible(11, 'BAD 1/1', 'Debe estar en el estado Registrado.')]),
    );
    const user = userEvent.setup();
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.type(screen.getByPlaceholderText(/Buscar por guía/i), 'BAD');

    const fila = await screen.findByRole('button', { name: /BAD 1\/1/ });
    expect(fila).toBeDisabled();
    expect(screen.getByText(/Debe estar en el estado Registrado/)).toBeInTheDocument();
  });

  it('deduplica entre lista y búsqueda por número de guía', async () => {
    const user = userEvent.setup();
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);

    // Lista: una guía "OK 1/1".
    await user.type(screen.getByPlaceholderText(/1\/2/), 'OK 1/1');

    // Búsqueda: selecciona el mismo paquete (misma guía).
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.type(screen.getByPlaceholderText(/Buscar por guía/i), 'OK');
    const fila = await screen.findByRole('button', { name: /OK 1\/1/ });
    await user.click(fila);

    // Pese a estar en lista y búsqueda, cuenta como 1 solo paquete.
    expect(await screen.findByRole('button', { name: /Crear con 1 paquete/i })).toBeInTheDocument();
  });

  it('crea usando solo la búsqueda, enviando paqueteIds sin numerosGuia', async () => {
    const user = userEvent.setup();
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText(/Ej: ENV/), 'ENV-1');
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.type(screen.getByPlaceholderText(/Buscar por guía/i), 'OK');
    const fila = await screen.findByRole('button', { name: /OK 1\/1/ });
    await user.click(fila);

    await user.click(await screen.findByRole('button', { name: /Crear con 1 paquete/i }));

    await waitFor(() => expect(crearMock).toHaveBeenCalledTimes(1));
    expect(crearMock).toHaveBeenCalledWith({
      codigo: 'ENV-1',
      numerosGuia: undefined,
      paqueteIds: [10],
    });
  });

  it('combina lista y búsqueda en el conteo total', async () => {
    buscarElegiblesMock.mockReturnValue(page([elegible(10, 'OK 1/1')]));
    const user = userEvent.setup();
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);

    // Dos guías por lista.
    await user.type(screen.getByPlaceholderText(/1\/2/), 'AAA 1/1\nBBB 1/1');
    // Una selección de búsqueda con guía distinta.
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.type(screen.getByPlaceholderText(/Buscar por guía/i), 'OK');
    await user.click(await screen.findByRole('button', { name: /OK 1\/1/ }));

    expect(await screen.findByRole('button', { name: /Crear con 3 paquetes/i })).toBeInTheDocument();
  });

  it('requiere código: el botón está deshabilitado sin código', async () => {
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);
    const boton = screen.getByRole('button', { name: /Crear envío/i });
    expect(boton).toBeDisabled();
  });

  it('muestra el detalle del paquete incluido en la sección de preview', async () => {
    const user = userEvent.setup();
    render(<CrearEnvioConGuiasDialog onClose={() => {}} />);
    await user.click(screen.getByRole('button', { name: 'Buscar' }));
    await user.type(screen.getByPlaceholderText(/Buscar por guía/i), 'OK');
    await user.click(await screen.findByRole('button', { name: /OK 1\/1/ }));

    const preview = screen.getByText('Paquetes a incluir').closest('div')!;
    expect(within(preview.parentElement as HTMLElement).getAllByText(/OK 1\/1/).length).toBeGreaterThan(0);
  });
});
