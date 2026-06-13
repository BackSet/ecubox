import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';
import { ChipFiltro } from '@/components/ChipFiltro';

/**
 * Garantiza que los controles interactivos compartidos usan el sistema de
 * movimiento canónico (utilidad `ui-transition` + feedback de presión) y que ya
 * no dependen de `transition-all`. No se prueban milisegundos de animación.
 */
describe('sistema de movimiento — controles compartidos', () => {
  it('Button usa ui-transition y feedback de presión, sin transition-all', () => {
    render(<Button>Guardar</Button>);
    const btn = screen.getByRole('button', { name: 'Guardar' });
    expect(btn.className).toContain('ui-transition');
    expect(btn.className).toContain('active:scale-[0.97]');
    expect(btn.className).not.toContain('transition-all');
  });

  it('ChipFiltro usa ui-transition y feedback de presión, sin transition-all', () => {
    render(
      <ChipFiltro label="Todos" count={3} active onClick={() => {}} />,
    );
    const chip = screen.getByRole('button', { name: /Todos/ });
    expect(chip.className).toContain('ui-transition');
    expect(chip.className).toContain('active:scale-[0.97]');
    expect(chip.className).not.toContain('transition-all');
    expect(chip).toHaveAttribute('aria-pressed', 'true');
  });
});
