import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { EquivalenciasEstadosClientePanel } from './EquivalenciasEstadosClientePanel';

afterEach(cleanup);

describe('EquivalenciasEstadosClientePanel', () => {
  it('muestra el título y la descripción canónicos', () => {
    render(<EquivalenciasEstadosClientePanel />);
    expect(
      screen.getByText('Equivalencias de estados para clientes'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/muestra términos más\s+simples a los clientes/i),
    ).toBeInTheDocument();
  });

  it('expone el código técnico, la etiqueta interna y la etiqueta cliente', () => {
    render(<EquivalenciasEstadosClientePanel />);
    // Código técnico (aparece en tabla y tarjetas; al menos uno).
    expect(screen.getAllByText('DESPACHO_COMPLETADO').length).toBeGreaterThan(0);
    // Etiqueta interna conserva la jerga.
    expect(screen.getAllByText('Despacho completado').length).toBeGreaterThan(0);
    // Etiqueta cliente simplificada.
    expect(screen.getAllByText('Entregada').length).toBeGreaterThan(0);
  });

  it('anota la agrupación de estados que comparten etiqueta cliente', () => {
    render(<EquivalenciasEstadosClientePanel />);
    const notas = screen.getAllByText(/Comparte la etiqueta «En camino a Ecuador»/i);
    expect(notas.length).toBeGreaterThan(0);
    expect(notas[0]!.textContent).toMatch(/cantidades de paquetes/i);
  });

  it('es de solo lectura: no contiene controles de edición', () => {
    const { container } = render(<EquivalenciasEstadosClientePanel />);
    const region = container.firstElementChild as HTMLElement;
    expect(within(region).queryByRole('button')).toBeNull();
    expect(within(region).queryByRole('textbox')).toBeNull();
    expect(within(region).queryByRole('combobox')).toBeNull();
    expect(within(region).queryByText(/guardar/i)).toBeNull();
  });
});
