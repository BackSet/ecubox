import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ConsignatarioForm } from './ConsignatarioForm';

const consignatarioEnEdicion = vi.hoisted(() => ({ current: undefined as unknown }));

vi.mock('@/hooks/useConsignatarios', () => ({
  useConsignatario: () => ({ data: consignatarioEnEdicion.current }),
  useCreateConsignatario: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 1 }), isPending: false }),
  useUpdateConsignatario: () => ({ mutateAsync: vi.fn().mockResolvedValue({ id: 1 }), isPending: false }),
}));

vi.mock('@/hooks/useOperarioDespachos', () => ({
  useConsignatarioOperario: () => ({ data: undefined }),
  useClientesOperario: () => ({ data: [] }),
  useCreateConsignatarioOperario: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateConsignatarioOperario: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/api/consignatarios.service', () => ({ sugerirCodigo: vi.fn() }));

// Cliente puro (sin CONSIGNATARIOS_OPERARIO).
vi.mock('@/stores/authStore', () => ({
  useAuthStore: (selector: (s: { hasPermission: (p: string) => boolean }) => unknown) =>
    selector({ hasPermission: () => false }),
}));

// ProvinciaCantonSelectors usa selects complejos; lo simplificamos en el test.
vi.mock('@/components/ProvinciaCantonSelectors', () => ({
  ProvinciaCantonSelectors: () => <div data-testid="ubicacion" />,
}));

afterEach(() => {
  cleanup();
  consignatarioEnEdicion.current = undefined;
});

function renderForm() {
  return render(<ConsignatarioForm onClose={vi.fn()} onSuccess={vi.fn()} />);
}

describe('ConsignatarioForm · etiqueta (vista cliente)', () => {
  it('el nombre usa copy de "persona que recibirá" (no ubicación)', () => {
    renderForm();
    expect(screen.getByText('Nombre de la persona que recibirá')).toBeInTheDocument();
    expect(
      screen.getByText('Escribe el nombre completo de quien recibirá los paquetes.'),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ej: María López')).toBeInTheDocument();
  });

  it('la etiqueta es opcional, con ayuda, placeholder y sugerencias', () => {
    renderForm();
    expect(screen.getByText('Etiqueta')).toBeInTheDocument();
    expect(screen.getByText('Opcional')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('Ej. Oficina') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    // Sugerencias rápidas.
    expect(screen.getByRole('button', { name: 'Regalos' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Compras personales' }));
    expect(input.value).toBe('Compras personales');
  });

  it('en edición precarga la etiqueta existente', () => {
    consignatarioEnEdicion.current = {
      id: 9,
      nombre: 'David Montero',
      telefono: '0990000000',
      direccion: 'Calle 1',
      provincia: 'Pichincha',
      canton: 'Quito',
      codigo: 'ECU-DM12',
      etiqueta: 'Trabajo',
    };
    render(<ConsignatarioForm id={9} onClose={vi.fn()} onSuccess={vi.fn()} />);
    expect((screen.getByPlaceholderText('Ej. Oficina') as HTMLInputElement).value).toBe('Trabajo');
  });
});
