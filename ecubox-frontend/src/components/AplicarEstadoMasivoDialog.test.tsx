import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  AplicarEstadoMasivoDialog,
  type AplicarEstadoItem,
  type AplicarEstadoOption,
} from './AplicarEstadoMasivoDialog';

const options: AplicarEstadoOption[] = [{ value: 'CANCELAR', label: 'Cancelar guía' }];

const items: AplicarEstadoItem[] = [
  { id: 1, searchText: 'TB-1', content: <span>TB-1</span> },
  { id: 2, searchText: 'TB-2', content: <span>TB-2</span> },
  {
    id: 3,
    searchText: 'TB-3',
    content: <span>TB-3</span>,
    disabledReason: 'Ya está en estado terminal (Cancelada)',
  },
];

function renderDialog(overrides: Partial<Parameters<typeof AplicarEstadoMasivoDialog>[0]> = {}) {
  const onSelectedIdsChange = vi.fn();
  render(
    <AplicarEstadoMasivoDialog
      open
      title="Aplicar acción a guías master"
      description="Aplica una acción a las guías seleccionadas."
      selectionLabel="guías"
      searchPlaceholder="Buscar..."
      items={items}
      selectedIds={[]}
      onSelectedIdsChange={onSelectedIdsChange}
      options={options}
      selectedOption="CANCELAR"
      onSelectedOptionChange={() => {}}
      optionLabel="Acción"
      loading={false}
      onConfirm={() => {}}
      onOpenChange={() => {}}
      confirmLabel="Aplicar acción"
      {...overrides}
    />,
  );
  return { onSelectedIdsChange };
}

describe('AplicarEstadoMasivoDialog', () => {
  afterEach(cleanup);

  it('muestra los elegibles y colapsa los no elegibles tras un toggle con conteo', () => {
    renderDialog();
    expect(screen.getByText('TB-1')).toBeInTheDocument();
    expect(screen.getByText('TB-2')).toBeInTheDocument();
    // El no elegible no se ve hasta expandir
    expect(screen.queryByText('TB-3')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mostrar no elegibles (1)' }),
    ).toBeInTheDocument();
  });

  it('al expandir, el no elegible aparece deshabilitado con su razón visible', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('button', { name: 'Mostrar no elegibles (1)' }));

    expect(screen.getByText('TB-3')).toBeInTheDocument();
    expect(screen.getByText('Ya está en estado terminal (Cancelada)')).toBeInTheDocument();
    const checkboxes = screen.getAllByRole('checkbox');
    const deshabilitados = checkboxes.filter((c) => c.hasAttribute('disabled'));
    expect(deshabilitados).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Ocultar no elegibles' })).toBeInTheDocument();
  });

  it('"Marcar visibles" selecciona solo los elegibles', async () => {
    const user = userEvent.setup();
    const { onSelectedIdsChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: /Marcar visibles/ }));

    expect(onSelectedIdsChange).toHaveBeenCalledWith([1, 2]);
  });

  it('usa el confirmLabel y lo deshabilita sin selección', () => {
    renderDialog();
    const confirmar = screen.getByRole('button', { name: /Aplicar acción/ });
    expect(confirmar).toBeDisabled();
  });

  it('habilita confirmar cuando hay selección', () => {
    renderDialog({ selectedIds: [1] });
    expect(screen.getByRole('button', { name: /Aplicar acción/ })).toBeEnabled();
  });

  it('muestra el emptyHint cuando no hay acción seleccionada', () => {
    renderDialog({ selectedOption: '', emptyHint: 'Selecciona una acción para ver las guías elegibles.' });
    expect(
      screen.getByText('Selecciona una acción para ver las guías elegibles.'),
    ).toBeInTheDocument();
  });
});
