import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AgregarPaquetesSacaDialog,
  type PaqueteDisponible,
} from './AgregarPaquetesSacaDialog';

afterEach(cleanup);

const conPeso: PaqueteDisponible = { id: 1, numeroGuia: 'GU-1', pesoLbs: 5 };
const sinPeso: PaqueteDisponible = { id: 2, numeroGuia: 'GU-2' };

function renderDialog(
  overrides: Partial<Parameters<typeof AgregarPaquetesSacaDialog>[0]> = {},
) {
  const onAgregarNueva = vi.fn();
  const onOpenChange = vi.fn();
  render(
    <AgregarPaquetesSacaDialog
      open
      onOpenChange={onOpenChange}
      modo="agregarASaca"
      sacaTipo="nueva"
      sacaNuevaIndex={0}
      sacaLabel="Saca nueva 1"
      // Un paquete sin peso ya forma parte del universo disponible.
      paquetesDisponibles={[conPeso, sinPeso]}
      paquetesUniverso={[conPeso, sinPeso]}
      onAgregarNueva={onAgregarNueva}
      {...overrides}
    />,
  );
  return { onAgregarNueva, onOpenChange };
}

describe('AgregarPaquetesSacaDialog', () => {
  it('abre el modal de creación con copy corto y botón seguro sin paquetes', () => {
    renderDialog({ modo: 'crearYDistribuir', onCrearYDistribuir: vi.fn() });

    expect(
      screen.getByRole('heading', { name: /ingresar paquetes y crear sacas/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/pega o escanea paquetes y elige cómo distribuirlos/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/crear 0 sacas/i)).not.toBeInTheDocument();
    expect(screen.getByText(/agrega al menos un paquete/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear sacas/i })).toBeDisabled();
  });

  it('enfoca la lista al abrir y permite cerrar con Escape', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog({
      modo: 'crearYDistribuir',
      onCrearYDistribuir: vi.fn(),
    });

    await waitFor(() =>
      expect(screen.getByPlaceholderText(/GU-12345/)).toHaveFocus(),
    );
    await user.keyboard('{Escape}');

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('permite agregar un paquete sin peso (no lo bloquea)', async () => {
    const user = userEvent.setup();
    const { onAgregarNueva } = renderDialog();

    const textarea = screen.getByPlaceholderText(/GU-12345/);
    await user.type(textarea, 'GU-2');
    await user.click(screen.getByRole('button', { name: /procesar lista/i }));

    expect(onAgregarNueva).toHaveBeenCalledWith(0, 2);
    expect(screen.getByText(/1 agregado/i)).toBeInTheDocument();
    // No debe quedar como "no encontrado" ni rechazada.
    expect(screen.queryByText(/no encontrado/i)).not.toBeInTheDocument();
  });

  it('comunica que los paquetes sin peso pueden incluirse', () => {
    renderDialog();
    expect(
      screen.getByText(/sin peso también pueden incluirse/i),
    ).toBeInTheDocument();
  });

  it('crea sacas con distribución automática por defecto', async () => {
    const user = userEvent.setup();
    const onCrearYDistribuir = vi.fn();
    renderDialog({
      modo: 'crearYDistribuir',
      onCrearYDistribuir,
    });

    await user.type(screen.getByPlaceholderText(/GU-12345/), 'GU-1\nGU-2');
    await user.click(screen.getByRole('button', { name: /procesar lista/i }));

    expect(screen.getByText(/Distribución automática/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crear 1 saca/i })).toBeEnabled();

    await user.click(screen.getByRole('button', { name: /crear 1 saca/i }));
    expect(onCrearYDistribuir).toHaveBeenCalledWith([1, 2], [2], undefined);
  });

  it('mantiene las opciones avanzadas disponibles', async () => {
    const user = userEvent.setup();
    renderDialog({ modo: 'crearYDistribuir', onCrearYDistribuir: vi.fn() });

    await user.click(screen.getByRole('button', { name: /opciones avanzadas/i }));

    expect(screen.getByRole('button', { name: /manual/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /por tamaño máximo/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /2 sacas/i })).toBeInTheDocument();
  });
});
