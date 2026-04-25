import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDomainStatusTone, StatusBadge } from './StatusBadge';

describe('getDomainStatusTone', () => {
  it('mapea estados conocidos', () => {
    expect(getDomainStatusTone('PENDIENTE')).toBe('warning');
    expect(getDomainStatusTone('DESPACHADO')).toBe('success');
    expect(getDomainStatusTone('CANCELADO')).toBe('error');
  });

  it('normaliza mayúsculas y guiones', () => {
    expect(getDomainStatusTone('en-transito')).toBe('info');
    expect(getDomainStatusTone('  pendiente  ')).toBe('warning');
  });

  it('devuelve neutral para null o desconocido', () => {
    expect(getDomainStatusTone(null)).toBe('neutral');
    expect(getDomainStatusTone('ESTADO_FANTASMA_XYZ')).toBe('neutral');
  });
});

describe('StatusBadge', () => {
  it('renderiza el texto hijo', () => {
    render(<StatusBadge>En curso</StatusBadge>);
    expect(screen.getByText('En curso')).toBeInTheDocument();
  });

  it('en modo solid success expone el texto accesible', () => {
    render(
      <StatusBadge tone="success" solid>
        Listo
      </StatusBadge>,
    );
    expect(screen.getByText('Listo')).toBeVisible();
  });
});
