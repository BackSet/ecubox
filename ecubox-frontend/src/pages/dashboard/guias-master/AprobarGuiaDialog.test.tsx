import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AprobarGuiaDialog } from './AprobarGuiaDialog';
import type { GuiaMaster } from '@/types/guia-master';

const aprobarState = vi.hoisted(() => ({
  mutateAsync: vi.fn().mockResolvedValue({}),
  isPending: false,
}));

vi.mock('@/hooks/useGuiasMaster', () => ({
  useAprobarGuiaMaster: () => aprobarState,
  useGuiaMasterHistorial: () => ({ data: [], isLoading: false }),
}));

function guia(over: Partial<GuiaMaster> = {}): GuiaMaster {
  return {
    id: 1,
    trackingBase: 'TB-1',
    totalPiezasEsperadas: 3,
    estadoGlobal: 'PENDIENTE_VERIFICACION',
    piezasRegistradas: 0,
    ...over,
  };
}

beforeEach(() => {
  aprobarState.mutateAsync.mockClear();
  aprobarState.isPending = false;
});
afterEach(cleanup);

describe('AprobarGuiaDialog', () => {
  it('aprueba directamente cuando no hay inconsistencia', async () => {
    render(<AprobarGuiaDialog guia={guia()} onClose={vi.fn()} onEnviarRevision={vi.fn()} />);
    const aprobar = screen.getByRole('button', { name: /^aprobar$/i });
    expect(aprobar).not.toBeDisabled();
    fireEvent.click(aprobar);
    await waitFor(() => expect(aprobarState.mutateAsync).toHaveBeenCalledWith(1));
  });

  it('con paquetes registrados exige confirmación explícita antes de aprobar', async () => {
    render(
      <AprobarGuiaDialog guia={guia({ piezasRegistradas: 2 })} onClose={vi.fn()} onEnviarRevision={vi.fn()} />,
    );
    expect(screen.getByText(/Requiere revisión/i)).toBeInTheDocument();
    const aprobar = screen.getByRole('button', { name: /^aprobar$/i });
    expect(aprobar).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox'));
    expect(aprobar).not.toBeDisabled();
  });

  it('delega "Enviar a revisión" al callback', () => {
    const onEnviar = vi.fn();
    render(<AprobarGuiaDialog guia={guia()} onClose={vi.fn()} onEnviarRevision={onEnviar} />);
    fireEvent.click(screen.getByRole('button', { name: /enviar a revisión/i }));
    expect(onEnviar).toHaveBeenCalled();
  });
});
