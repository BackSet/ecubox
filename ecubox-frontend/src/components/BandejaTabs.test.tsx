import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ShieldAlert } from 'lucide-react';
import { BandejaTabs, type BandejaOption } from './BandejaTabs';

type V = 'a' | 'b' | 'c';

function baseOptions(over: Partial<Record<V, Partial<BandejaOption<V>>>> = {}): BandejaOption<V>[] {
  return [
    { value: 'a', label: 'Operativos', count: 5, tone: 'primary', ...over.a },
    { value: 'b', label: 'Todos', count: 0, ...over.b },
    { value: 'c', label: 'En revisión', count: 2, tone: 'warning', icon: ShieldAlert, ...over.c },
  ];
}

/** Wrapper controlado para que la navegación por teclado mueva el valor activo. */
function Controlled({
  initial = 'a',
  options,
  onValueChange,
  ...rest
}: {
  initial?: V;
  options: BandejaOption<V>[];
  onValueChange?: (v: V) => void;
  title?: string;
  description?: string;
  help?: string;
}) {
  const [value, setValue] = useState<V>(initial);
  return (
    <BandejaTabs<V>
      value={value}
      onValueChange={(v) => { setValue(v); onValueChange?.(v); }}
      options={options}
      {...rest}
    />
  );
}

afterEach(cleanup);

describe('BandejaTabs', () => {
  it('renderiza opciones con semántica de tabs y contador (oculta el 0)', () => {
    render(<Controlled options={baseOptions()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Operativos\s*5/ })).toBeInTheDocument();
    // count=0 no muestra badge.
    expect(screen.getByRole('tab', { name: 'Todos' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /En revisión\s*2/ })).toBeInTheDocument();
  });

  it('marca la activa con aria-selected y gestiona el tabIndex', () => {
    render(<Controlled initial="a" options={baseOptions()} />);
    expect(screen.getByRole('tab', { name: /Operativos/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Todos' })).toHaveAttribute('tabindex', '-1');
  });

  it('oculta opciones con hidden', () => {
    render(<Controlled options={baseOptions({ c: { hidden: true } })} />);
    expect(screen.queryByRole('tab', { name: /En revisión/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('llama onValueChange al hacer click', () => {
    const onChange = vi.fn();
    render(<Controlled options={baseOptions()} onValueChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Todos' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('no activa opciones deshabilitadas (click ni teclado las salta)', () => {
    const onChange = vi.fn();
    render(<Controlled options={baseOptions({ b: { disabled: true } })} onValueChange={onChange} />);
    const todos = screen.getByRole('tab', { name: 'Todos' });
    expect(todos).toBeDisabled();
    fireEvent.click(todos);
    expect(onChange).not.toHaveBeenCalled();
    // Desde 'a', ArrowRight debe saltar 'b' (disabled) y caer en 'c'.
    fireEvent.keyDown(screen.getByRole('tab', { name: /Operativos/ }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('c');
  });

  it('navega con flechas y Home/End', () => {
    const onChange = vi.fn();
    render(<Controlled options={baseOptions()} onValueChange={onChange} />);
    const a = screen.getByRole('tab', { name: /Operativos/ });
    fireEvent.keyDown(a, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('b');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Todos' }), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('c');
    fireEvent.keyDown(screen.getByRole('tab', { name: /En revisión/ }), { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('a');
  });

  it('renderiza título, descripción y ayuda de la bandeja activa', () => {
    render(
      <Controlled
        options={baseOptions()}
        title="Paquetes operativos"
        description="Disponibles para continuar."
        help="La revisión no cambia el estado."
      />,
    );
    expect(screen.getByText('Paquetes operativos')).toBeInTheDocument();
    expect(screen.getByText('Disponibles para continuar.')).toBeInTheDocument();
    expect(screen.getByText('La revisión no cambia el estado.')).toBeInTheDocument();
  });

  it('usa accessibleLabel como aria-label de la opción', () => {
    render(<Controlled options={baseOptions({ c: { accessibleLabel: 'Paquetes en revisión' } })} />);
    expect(screen.getByRole('tab', { name: 'Paquetes en revisión' })).toBeInTheDocument();
  });

  it('el contenedor desplaza su propio overflow (scroll local, no de página)', () => {
    render(<Controlled options={baseOptions()} />);
    expect(screen.getByRole('tablist').className).toContain('overflow-x-auto');
  });
});
