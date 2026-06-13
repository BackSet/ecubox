import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AccesoEnlace } from '@/types/acceso-enlace';

const accesoEnlacesData = vi.hoisted(() => ({ current: [] as AccesoEnlace[] }));
const generarMutate = vi.hoisted(() => vi.fn());
const revocarMutate = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useAccesoEnlaces', () => ({
  useAccesoEnlaces: () => ({
    data: accesoEnlacesData.current,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
    isFetching: false,
  }),
  useGenerarAccesoEnlace: () => ({ mutateAsync: generarMutate, isPending: false }),
  useRevocarAccesoEnlace: () => ({ mutateAsync: revocarMutate, isPending: false }),
}));

vi.mock('@/hooks/useOperarioDespachos', () => ({
  useConsignatariosOperario: () => ({
    data: [{ id: 1, nombre: 'Cliente Uno', codigo: 'ECU-0001', telefono: null, clienteUsuarioNombre: null }],
  }),
}));

// Combobox simplificado: un botón por opción que invoca onChange(getKey(option)).
vi.mock('@/components/ui/searchable-combobox', () => ({
  SearchableCombobox: ({ options, getKey, getLabel, onChange }: any) => (
    <div>
      {options.map((o: any) => (
        <button key={getKey(o)} type="button" onClick={() => onChange(getKey(o))}>
          opt-{getLabel(o)}
        </button>
      ))}
    </div>
  ),
}));

import { EnlacesAccesoPage } from './EnlacesAccesoPage';

function enlace(overrides: Partial<AccesoEnlace> = {}): AccesoEnlace {
  return {
    id: 1,
    codigo: 'ACC-000001',
    token: 'tok-abc',
    tipo: 'PERSISTENTE',
    etiqueta: 'Cliente Uno',
    expiraAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ultimoAccesoAt: null,
    vigente: true,
    consignatarios: [{ id: 1, nombre: 'Cliente Uno', codigo: 'ECU-0001' }],
    creadoPor: 'admin',
    ...overrides,
  };
}

beforeAll(() => {
  for (const m of ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture'] as const) {
    Object.defineProperty(HTMLElement.prototype, m, { configurable: true, value: () => undefined });
  }
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: () => undefined });
});

describe('EnlacesAccesoPage', () => {
  beforeEach(() => {
    generarMutate.mockReset();
    revocarMutate.mockReset();
    accesoEnlacesData.current = [
      enlace({ id: 1, codigo: 'ACC-000001', etiqueta: 'Cliente Uno', token: 'tok-1' }),
      enlace({ id: 2, codigo: 'ACC-000002', etiqueta: 'Cliente Dos', token: 'tok-2' }),
    ];
  });
  afterEach(cleanup);

  it('muestra el código del enlace en el listado', () => {
    render(<EnlacesAccesoPage />);
    expect(screen.getByText('ACC-000001')).toBeInTheDocument();
    expect(screen.getByText('ACC-000002')).toBeInTheDocument();
  });

  it('la búsqueda por código filtra el enlace correcto', async () => {
    const user = userEvent.setup();
    render(<EnlacesAccesoPage />);

    await user.type(
      screen.getByPlaceholderText('Buscar por código, etiqueta o consignatario...'),
      'ACC-000002',
    );

    // ListToolbar aplica debounce (300ms) antes de propagar la búsqueda.
    await waitFor(() => expect(screen.queryByText('ACC-000001')).not.toBeInTheDocument());
    expect(screen.getByText('ACC-000002')).toBeInTheDocument();
  });

  it('copiar enlace usa la URL con el token', async () => {
    const user = userEvent.setup();
    render(<EnlacesAccesoPage />);

    const fila = screen.getByText('ACC-000001').closest('tr')!;
    await user.click(within(fila).getByRole('button', { name: 'Copiar' }));

    // userEvent provee el stub de clipboard; el enlace copiado usa la URL con token.
    await waitFor(async () =>
      expect(await navigator.clipboard.readText()).toContain('/acceso?token=tok-1'),
    );
  });

  it('el diálogo de enlace generado muestra el código', async () => {
    const user = userEvent.setup();
    generarMutate.mockResolvedValue({
      token: 'tok-nuevo',
      enlace: enlace({ id: 9, codigo: 'ACC-000009', token: 'tok-nuevo' }),
    });
    render(<EnlacesAccesoPage />);

    await user.click(screen.getByRole('button', { name: /Nuevo enlace/ }));
    await user.click(await screen.findByRole('button', { name: 'opt-Cliente Uno · ECU-0001' }));
    await user.click(screen.getByRole('button', { name: 'Agregar' }));
    await user.click(screen.getByRole('button', { name: /Generar enlace/ }));

    expect(await screen.findByText('Enlace listo para compartir')).toBeInTheDocument();
    expect(screen.getByText('ACC-000009')).toBeInTheDocument();
  });
});
