import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RegistrarMisGuiasDialog } from './RegistrarMisGuiasDialog';
import { GUIA_TRACKING_HINT_CAMPO } from './guiaTrackingHelpContent';

const registrarMock = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useConsignatarios', () => ({
  useConsignatarios: () => ({
    data: [{ id: 1, nombre: 'Juan Pérez', codigo: 'C-001' }],
    isLoading: false,
  }),
}));

vi.mock('@/lib/api/mis-guias.service', () => ({
  registrarMiGuia: registrarMock,
}));

vi.mock('@/lib/notify', () => ({
  notify: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  },
}));

function renderDialog() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RegistrarMisGuiasDialog onClose={vi.fn()} />
    </QueryClientProvider>,
  );
}

async function seleccionarDestinatario(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/quién recibirá/i));
  await user.click(await screen.findByText('Juan Pérez'));
}

beforeEach(() => {
  registrarMock.mockReset();
  registrarMock.mockResolvedValue({ id: 10 });
});
afterEach(cleanup);

describe('RegistrarMisGuiasDialog · ayuda de número de guía', () => {
  it('incluye el disparador de ayuda y el texto breve bajo el campo', async () => {
    const user = userEvent.setup();
    renderDialog();
    await seleccionarDestinatario(user);

    expect(
      screen.getByRole('button', { name: /no sabes cuál número ingresar/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(GUIA_TRACKING_HINT_CAMPO)).toBeInTheDocument();
  });

  it('abre la ayuda sin cerrar el formulario ni perder los datos escritos', async () => {
    const user = userEvent.setup();
    renderDialog();
    await seleccionarDestinatario(user);

    const inputs = screen.getAllByPlaceholderText(/^Ej:/);
    await user.type(inputs[0], '1Z999AA10123456784');

    await user.click(screen.getByRole('button', { name: /no sabes cuál número ingresar/i }));
    // Se abre la ayuda (contenido detallado) sin desmontar el formulario.
    expect(await screen.findByText('¿Dónde suele aparecer?')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByText('¿Dónde suele aparecer?')).toBeNull());
    // El valor escrito sigue presente y el formulario sigue abierto.
    expect(screen.getByDisplayValue('1Z999AA10123456784')).toBeInTheDocument();
  });

  it('muestra un aviso NO bloqueante si el valor parece un número de pedido', async () => {
    const user = userEvent.setup();
    renderDialog();
    await seleccionarDestinatario(user);

    const input = screen.getAllByPlaceholderText(/^Ej:/)[0];
    await user.type(input, '114-1234567-1234567');

    // El aviso es advisory (role="status"), NO un error de validación que bloquee.
    const aviso = await screen.findByText(/parece un número de pedido/i);
    expect(aviso.closest('[role="status"]')).not.toBeNull();
    // El campo no queda marcado como inválido: se puede continuar.
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('pegar varios números crea una fila por cada uno y permite registrar', async () => {
    const user = userEvent.setup();
    renderDialog();
    await seleccionarDestinatario(user);

    const input = screen.getAllByPlaceholderText(/^Ej:/)[0];
    await user.click(input);
    await user.paste('1Z111\n1Z222\n1Z333');

    await waitFor(() =>
      expect(screen.getByDisplayValue('1Z333')).toBeInTheDocument(),
    );
    expect(screen.getByDisplayValue('1Z111')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1Z222')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /registrar 3 guías/i }));
    await waitFor(() => expect(registrarMock).toHaveBeenCalledTimes(3));
    expect(registrarMock).toHaveBeenCalledWith({ trackingBase: '1Z111', consignatarioId: 1 });
  });
});
