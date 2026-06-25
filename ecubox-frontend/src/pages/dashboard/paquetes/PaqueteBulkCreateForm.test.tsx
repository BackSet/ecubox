import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaqueteBulkCreateForm } from './PaqueteBulkCreateForm';
import { createPaquete } from '@/lib/api/paquetes.service';

const guia = {
  id: 10,
  trackingBase: '1Z-ECU-001',
  consignatarioId: 20,
  consignatarioNombre: 'Maria Perez',
  estadoGlobal: 'SIN_PAQUETES_REGISTRADOS',
  totalPiezasEsperadas: 2,
  piezasRegistradas: 0,
};

vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (state: { hasPermission: (permiso: string) => boolean }) => unknown) =>
    selector({ hasPermission: () => true }),
}));

vi.mock('@/hooks/useGuiasMaster', () => ({
  GUIAS_MASTER_QUERY_KEY: ['guias-master'],
  useGuiasMaster: () => ({ data: [guia] }),
  useGuiaMaster: (id?: number | null) => ({ data: id ? guia : undefined }),
}));

vi.mock('@/lib/api/paquetes.service', () => ({
  createPaquete: vi.fn(async (body) => ({ id: Math.random(), ...body })),
  updatePaquete: vi.fn(),
  deletePaquete: vi.fn(),
}));

vi.mock('@/lib/api/guias-master.service', () => ({
  actualizarGuiaMaster: vi.fn(async () => ({})),
  listarPiezasDeGuiaMaster: vi.fn(async () => []),
}));

vi.mock('@/lib/notify', () => ({
  notify: {
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
    success: vi.fn(),
    warning: vi.fn(),
  },
}));

vi.mock('./GuiaMasterCombobox', () => ({
  GuiaMasterCombobox: ({
    value,
    onChange,
    options,
    disabled,
  }: {
    value?: number;
    onChange: (id: number) => void;
    options: Array<{ id: number; trackingBase: string }>;
    disabled?: boolean;
  }) => (
    <select
      aria-label="Guia"
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      <option value="">Seleccione</option>
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.trackingBase}
        </option>
      ))}
    </select>
  ),
}));

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PaqueteBulkCreateForm onClose={vi.fn()} onSuccess={vi.fn()} />
    </QueryClientProvider>,
  );
}

async function seleccionarGuia(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Guia'), String(guia.id));
  await screen.findByText('Paquetes del lote');
}

async function completarContenidos(
  user: ReturnType<typeof userEvent.setup>,
  _container: HTMLElement,
) {
  await waitFor(() =>
    expect(document.body.querySelectorAll<HTMLInputElement>('input[id^="bulk-contenido-"]')).toHaveLength(2),
  );
  const contenidos = Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[id^="bulk-contenido-"]'),
  );
  expect(contenidos).toHaveLength(2);
  await user.clear(contenidos[0]);
  await user.type(contenidos[0], 'Zapatos');
  await user.clear(contenidos[1]);
  await user.type(contenidos[1], 'Ropa');
}

async function registrar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Registrar 2 paquetes' }));
}

describe('PaqueteBulkCreateForm', () => {
  beforeEach(() => {
    vi.mocked(createPaquete).mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('no muestra Contenido para todos y mantiene Paquetes del lote', async () => {
    const user = userEvent.setup();
    renderForm();

    await seleccionarGuia(user);

    expect(screen.queryByText('Contenido para todos')).not.toBeInTheDocument();
    expect(screen.getByText('Paquetes del lote')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('crea paquetes sin peso cuando el peso para todos queda vacio', async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    await seleccionarGuia(user);
    await completarContenidos(user, container);
    await registrar(user);

    await waitFor(() => expect(createPaquete).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createPaquete).mock.calls[0][0]).toMatchObject({
      consignatarioId: guia.consignatarioId,
      guiaMasterId: guia.id,
      contenido: 'Zapatos',
    });
    expect(vi.mocked(createPaquete).mock.calls[0][0]).not.toHaveProperty('pesoLbs');
    expect(vi.mocked(createPaquete).mock.calls[1][0]).not.toHaveProperty('pesoLbs');
  });

  it('aplica el mismo peso a todos los paquetes nuevos del lote', async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    await seleccionarGuia(user);
    await user.type(screen.getByLabelText('Peso para todos los paquetes en libras'), '5.5');
    expect(screen.getByText('Se aplicara 5.5 lbs a todos los paquetes del lote.')).toBeInTheDocument();
    await completarContenidos(user, container);
    await registrar(user);

    await waitFor(() => expect(createPaquete).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createPaquete).mock.calls.map(([body]) => body.pesoLbs)).toEqual([5.5, 5.5]);
    expect(vi.mocked(createPaquete).mock.calls.map(([body]) => body.pesoKg)).toEqual([2.49, 2.49]);
  });

  it('limpia el peso aplicado al vaciar el peso para todos', async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    await seleccionarGuia(user);
    const peso = screen.getByLabelText('Peso para todos los paquetes en libras');
    await user.type(peso, '3');
    await user.clear(peso);
    await completarContenidos(user, container);
    await registrar(user);

    await waitFor(() => expect(createPaquete).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createPaquete).mock.calls[0][0]).not.toHaveProperty('pesoLbs');
    expect(vi.mocked(createPaquete).mock.calls[1][0]).not.toHaveProperty('pesoLbs');
  });

  it('muestra error para peso invalido y no envia payload', async () => {
    const user = userEvent.setup();
    const { container } = renderForm();

    await seleccionarGuia(user);
    await user.type(screen.getByLabelText('Peso para todos los paquetes en libras'), '0');
    await completarContenidos(user, container);
    await registrar(user);

    expect(screen.getByText('El peso debe ser mayor a 0')).toBeInTheDocument();
    expect(createPaquete).not.toHaveBeenCalled();
  });

  it('mantiene controles responsivos basicos en la seccion principal', async () => {
    const user = userEvent.setup();
    renderForm();

    await seleccionarGuia(user);
    const section = screen.getByText('Paquetes del lote').closest('.space-y-2');
    expect(section).toBeTruthy();
    expect(within(section as HTMLElement).getByText('Peso para todos los paquetes')).toBeInTheDocument();
    expect(screen.getByText('Paquetes del lote').closest('.flex')?.className).toContain('sm:flex-row');
    expect(screen.getByLabelText('Peso para todos los paquetes en libras')).toHaveClass('min-w-0');
  });
});
