import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import type { UnsavedChangesBlocker } from '@/hooks/useUnsavedChangesBlocker';

afterEach(cleanup);

function blocker(status: string, proceed = vi.fn(), reset = vi.fn()): UnsavedChangesBlocker {
  return { status, proceed, reset } as unknown as UnsavedChangesBlocker;
}

describe('UnsavedChangesDialog', () => {
  it('no muestra nada cuando la navegación no está bloqueada', () => {
    render(<UnsavedChangesDialog blocker={blocker('idle')} />);
    expect(screen.queryByText('Cambios sin guardar')).not.toBeInTheDocument();
  });

  it('al bloquearse muestra el diálogo y confirmar continúa (proceed)', () => {
    const proceed = vi.fn();
    render(<UnsavedChangesDialog blocker={blocker('blocked', proceed)} />);
    expect(screen.getByText('Cambios sin guardar')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /salir sin guardar/i }));
    expect(proceed).toHaveBeenCalledTimes(1);
  });

  it('cancelar (seguir editando) llama a reset', () => {
    const reset = vi.fn();
    render(<UnsavedChangesDialog blocker={blocker('blocked', vi.fn(), reset)} />);
    fireEvent.click(screen.getByRole('button', { name: /seguir editando/i }));
    expect(reset).toHaveBeenCalled();
  });

  it('permite sobrescribir el confirmar (p. ej. «Guardar y salir»)', () => {
    const onConfirm = vi.fn();
    render(
      <UnsavedChangesDialog
        blocker={blocker('blocked')}
        confirmLabel="Guardar y salir"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /guardar y salir/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
