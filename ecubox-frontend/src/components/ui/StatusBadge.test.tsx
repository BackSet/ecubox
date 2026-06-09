import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getDomainStatusTone, getRastreoStatusTone, StatusBadge } from './StatusBadge';

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

  it('mapea estados v2 de guía master y consolidado', () => {
    expect(getDomainStatusTone('EN_TRANSITO_USA_ECUADOR')).toBe('primary');
    expect(getDomainStatusTone('DESPACHO_INCOMPLETO')).toBe('error');
    expect(getDomainStatusTone('CANCELADA')).toBe('neutral');
    expect(getDomainStatusTone('RECIBIDO_EN_BODEGA')).toBe('success');
    expect(getDomainStatusTone('LIQUIDADO')).toBe('success');
  });
});

describe('getRastreoStatusTone', () => {
  it('deriva el tono del tipoFlujo sin depender del código', () => {
    expect(getRastreoStatusTone('ALTERNO')).toBe('warning');
    expect(getRastreoStatusTone('NORMAL')).toBe('info');
    expect(getRastreoStatusTone(null)).toBe('info');
    expect(getRastreoStatusTone(undefined)).toBe('info');
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
