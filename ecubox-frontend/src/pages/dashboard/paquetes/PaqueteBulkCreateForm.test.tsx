import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaqueteBulkCreateForm } from './PaqueteBulkCreateForm';
import { createPaquete } from '@/lib/api/paquetes.service';

// Configuración mutable compartida por los mocks; se reinicia en cada test.
const cfg = vi.hoisted(() => ({
  permisos: new Set<string>(),
  guia: {} as Record<string, unknown>,
  piezas: [] as Array<Record<string, unknown>>,
}));

const baseGuia = {
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
    selector({ hasPermission: (p: string) => cfg.permisos.has(p) }),
}));

vi.mock('@/hooks/useGuiasMaster', () => ({
  GUIAS_MASTER_QUERY_KEY: ['guias-master'],
  useGuiasMaster: () => ({ data: [cfg.guia] }),
  useGuiaMaster: (id?: number | null) => ({ data: id ? cfg.guia : undefined }),
}));

vi.mock('@/lib/api/paquetes.service', () => ({
  createPaquete: vi.fn(async (body) => ({ id: Math.random(), ...body })),
  updatePaquete: vi.fn(async (id, body) => ({ id, ...body })),
  deletePaquete: vi.fn(),
}));

vi.mock('@/lib/api/guias-master.service', () => ({
  actualizarGuiaMaster: vi.fn(async () => ({})),
  listarPiezasDeGuiaMaster: vi.fn(async () => cfg.piezas),
}));

vi.mock('@/lib/notify', () => ({
  notify: {
    error: vi.fn(),
    info: vi.fn(),
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

function renderForm(props?: { editGuiaMasterId?: number }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PaqueteBulkCreateForm onClose={vi.fn()} onSuccess={vi.fn()} {...props} />
    </QueryClientProvider>,
  );
}

async function seleccionarGuia(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Guia'), String(cfg.guia.id));
  await screen.findByText('Paquetes del lote');
}

function contenidoInputs(): HTMLInputElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[id^="bulk-contenido-"]'),
  );
}

async function completarContenidos(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(() => expect(contenidoInputs()).toHaveLength(2));
  const [a, b] = contenidoInputs();
  await user.clear(a);
  await user.type(a, 'Zapatos');
  await user.clear(b);
  await user.type(b, 'Ropa');
}

async function registrar(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Registrar 2 paquetes' }));
}

function pesoLbsInputs(): HTMLInputElement[] {
  return Array.from(
    document.body.querySelectorAll<HTMLInputElement>('input[aria-label="Peso en libras"]'),
  );
}

describe('PaqueteBulkCreateForm', () => {
  beforeEach(() => {
    cfg.permisos = new Set(['PAQUETES_PESO_WRITE', 'PAQUETES_UPDATE', 'PAQUETES_DELETE']);
    cfg.guia = { ...baseGuia };
    cfg.piezas = [];
    vi.mocked(createPaquete).mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('organiza el modal con secciones y mantiene Paquetes del lote', async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.getByText('Guía')).toBeInTheDocument();
    await seleccionarGuia(user);

    expect(screen.queryByText('Contenido para todos')).not.toBeInTheDocument();
    expect(screen.getByText('Configuración del lote')).toBeInTheDocument();
    expect(screen.getByText('Paquetes del lote')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('aplica presets de cantidad y ajusta las filas', async () => {
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);

    // Cupo restante = 2, así que el preset disponible 2 debe estar.
    await user.click(screen.getByRole('button', { name: '2' }));
    await waitFor(() => expect(contenidoInputs()).toHaveLength(2));
  });

  it('crea paquetes sin peso cuando no se aplica peso para todos', async () => {
    const user = userEvent.setup();
    renderForm();

    await seleccionarGuia(user);
    await completarContenidos(user);
    await registrar(user);

    await waitFor(() => expect(createPaquete).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createPaquete).mock.calls[0][0]).toMatchObject({
      consignatarioId: baseGuia.consignatarioId,
      guiaMasterId: baseGuia.id,
      contenido: 'Zapatos',
    });
    expect(vi.mocked(createPaquete).mock.calls[0][0]).not.toHaveProperty('pesoLbs');
    expect(vi.mocked(createPaquete).mock.calls[1][0]).not.toHaveProperty('pesoLbs');
  });

  it('no aplica el peso mientras se escribe: requiere pulsar "Aplicar a todos"', async () => {
    const user = userEvent.setup();
    renderForm();

    await seleccionarGuia(user);
    await user.type(screen.getByLabelText('Peso para todos los paquetes en libras'), '5.5');
    // Escribir no debe tocar las filas todavía.
    expect(pesoLbsInputs().every((i) => i.value === '')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Aplicar a todos' }));
    await waitFor(() => expect(pesoLbsInputs().every((i) => i.value === '5.5')).toBe(true));

    await completarContenidos(user);
    await registrar(user);

    await waitFor(() => expect(createPaquete).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createPaquete).mock.calls.map(([b]) => b.pesoLbs)).toEqual([5.5, 5.5]);
    expect(vi.mocked(createPaquete).mock.calls.map(([b]) => b.pesoKg)).toEqual([2.49, 2.49]);
  });

  it('aplica el peso solo a los paquetes sin peso', async () => {
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);

    // Peso manual en la primera fila.
    await user.type(pesoLbsInputs()[0], '2');
    // Peso para todos y aplicar solo a sin peso.
    await user.type(screen.getByLabelText('Peso para todos los paquetes en libras'), '5.5');
    await user.click(screen.getByRole('button', { name: 'Aplicar solo a paquetes sin peso' }));

    await completarContenidos(user);
    await registrar(user);

    await waitFor(() => expect(createPaquete).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createPaquete).mock.calls.map(([b]) => b.pesoLbs)).toEqual([2, 5.5]);
  });

  it('confirma antes de reemplazar pesos ya ingresados al aplicar a todos', async () => {
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);

    await user.type(pesoLbsInputs()[0], '2');
    await user.type(screen.getByLabelText('Peso para todos los paquetes en libras'), '5.5');
    await user.click(screen.getByRole('button', { name: 'Aplicar a todos' }));

    expect(screen.getByText('Esto reemplazará pesos ya ingresados.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Reemplazar todos' }));

    await completarContenidos(user);
    await registrar(user);
    await waitFor(() => expect(createPaquete).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createPaquete).mock.calls.map(([b]) => b.pesoLbs)).toEqual([5.5, 5.5]);
  });

  it('limpia los pesos de todas las filas', async () => {
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);

    await user.type(screen.getByLabelText('Peso para todos los paquetes en libras'), '3');
    await user.click(screen.getByRole('button', { name: 'Aplicar a todos' }));
    await waitFor(() => expect(pesoLbsInputs().every((i) => i.value === '3')).toBe(true));

    await user.click(screen.getByRole('button', { name: 'Limpiar pesos' }));
    await waitFor(() => expect(pesoLbsInputs().every((i) => i.value === '')).toBe(true));

    await completarContenidos(user);
    await registrar(user);
    await waitFor(() => expect(createPaquete).toHaveBeenCalledTimes(2));
    expect(vi.mocked(createPaquete).mock.calls[0][0]).not.toHaveProperty('pesoLbs');
  });

  it('marca error y deshabilita aplicar cuando el peso para todos es 0', async () => {
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);

    await user.type(screen.getByLabelText('Peso para todos los paquetes en libras'), '0');
    expect(screen.getByText('El peso debe ser mayor a 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aplicar a todos' })).toBeDisabled();
  });

  it('bloquea el registro si una fila tiene peso 0 e indica el error', async () => {
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);
    await completarContenidos(user);

    await user.type(pesoLbsInputs()[0], '0');
    await registrar(user);

    expect(await screen.findByText(/El peso debe ser mayor a 0/)).toBeInTheDocument();
    expect(createPaquete).not.toHaveBeenCalled();
  });

  it('reparte una lista pegada en varias filas de contenido', async () => {
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);

    const primera = contenidoInputs()[0];
    primera.focus();
    await user.paste('Camisa\nPantalon\nMedias');

    await waitFor(() => expect(contenidoInputs().length).toBeGreaterThanOrEqual(3));
    const valores = contenidoInputs().map((i) => i.value);
    expect(valores).toContain('Camisa');
    expect(valores).toContain('Pantalon');
    expect(valores).toContain('Medias');
  });

  it('oculta el peso cuando el usuario no tiene permiso de peso', async () => {
    cfg.permisos = new Set(['PAQUETES_UPDATE']);
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);

    expect(screen.queryByText('Peso para todos los paquetes')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Peso para todos los paquetes en libras')).not.toBeInTheDocument();
  });

  it('avisa que la guía bloqueada no admite piezas nuevas en modo edición', async () => {
    cfg.guia = { ...baseGuia, estadoGlobal: 'EN_REVISION', piezasRegistradas: 1 };
    cfg.piezas = [
      { id: 100, contenido: 'Existente', pesoLbs: null, pesoKg: null, piezaNumero: 1 },
    ];
    renderForm({ editGuiaMasterId: 10 });

    expect(await screen.findByText(/no se pueden registrar piezas nuevas/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Añadir fila/ })).not.toBeInTheDocument();
  });

  it('precarga las piezas existentes en modo edición', async () => {
    cfg.guia = { ...baseGuia, estadoGlobal: 'VERIFICADA', piezasRegistradas: 1 };
    cfg.piezas = [
      { id: 100, contenido: 'Tablet', pesoLbs: 4, pesoKg: 1.81, piezaNumero: 1 },
    ];
    renderForm({ editGuiaMasterId: 10 });

    await screen.findByText('Paquetes del lote');
    await waitFor(() => expect(contenidoInputs()).toHaveLength(1));
    expect(contenidoInputs()[0].value).toBe('Tablet');
  });

  it('el modal usa contenedor flex con altura máxima y body scrolleable', async () => {
    const user = userEvent.setup();
    renderForm();
    await seleccionarGuia(user);

    const dialog = document.body.querySelector('[role="dialog"]');
    expect(dialog?.className).toContain('max-h-[90dvh]');
    expect(dialog?.className).toContain('flex');
    expect(dialog?.className).toContain('overflow-hidden');

    const peso = screen.getByLabelText('Peso para todos los paquetes en libras');
    expect(peso).toHaveClass('min-w-0');
    const scrollBody = peso.closest('.overflow-y-auto');
    expect(scrollBody).toBeTruthy();
    expect(within(scrollBody as HTMLElement).getByText('Configuración del lote')).toBeInTheDocument();
  });
});
