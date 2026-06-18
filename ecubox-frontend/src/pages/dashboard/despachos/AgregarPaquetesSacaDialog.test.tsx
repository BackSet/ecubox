import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
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
  render(
    <AgregarPaquetesSacaDialog
      open
      onOpenChange={() => {}}
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
  return { onAgregarNueva };
}

describe('AgregarPaquetesSacaDialog', () => {
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
});
