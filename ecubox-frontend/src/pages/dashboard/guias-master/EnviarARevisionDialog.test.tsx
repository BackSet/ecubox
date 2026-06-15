import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EnviarARevisionDialog } from './EnviarARevisionDialog';
import type { GuiaMaster } from '@/types/guia-master';

// Radix Select usa APIs de puntero que jsdom no implementa.
beforeAll(() => {
  for (const m of ['hasPointerCapture', 'setPointerCapture', 'releasePointerCapture'] as const) {
    Object.defineProperty(HTMLElement.prototype, m, { configurable: true, value: () => undefined });
  }
  Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: () => undefined });
});

const marcarState = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
}));

vi.mock('@/hooks/useGuiasMaster', () => ({
  useMarcarGuiaMasterEnRevision: () => marcarState,
}));

const guia: GuiaMaster = {
  id: 1,
  trackingBase: 'TB-1',
  totalPiezasEsperadas: 3,
  estadoGlobal: 'PENDIENTE_VERIFICACION',
};

beforeEach(() => {
  marcarState.mutateAsync.mockClear();
  marcarState.isPending = false;
});
afterEach(cleanup);

describe('EnviarARevisionDialog', () => {
  it('exige seleccionar un motivo antes de enviar', async () => {
    render(<EnviarARevisionDialog guia={guia} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i }));
    expect(await screen.findByText('Selecciona un motivo de revisión.')).toBeInTheDocument();
    expect(marcarState.mutateAsync).not.toHaveBeenCalled();
  });

  it('serializa motivo + observación y llama a la mutación', async () => {
    render(<EnviarARevisionDialog guia={guia} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Total de paquetes incorrecto' }));
    fireEvent.change(screen.getByLabelText(/observación/i), { target: { value: 'faltan 2' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i }));
    await waitFor(() =>
      expect(marcarState.mutateAsync).toHaveBeenCalledWith({
        id: 1,
        body: { motivo: 'TOTAL_PAQUETES_INCORRECTO: faltan 2' },
      }),
    );
  });

  it('"Otro" exige observación', async () => {
    render(<EnviarARevisionDialog guia={guia} onClose={vi.fn()} />);
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByRole('option', { name: 'Otro' }));
    fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i }));
    expect(await screen.findByText(/requiere una observación/i)).toBeInTheDocument();
    expect(marcarState.mutateAsync).not.toHaveBeenCalled();
  });
});
