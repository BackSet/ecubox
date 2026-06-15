import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MultiDestinatariosSection } from './MultiDestinatariosSection';

// El componente usa <Link> de TanStack; lo reemplazamos por un <a> simple.
vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children, ...rest }: { to: string; children: React.ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

describe('MultiDestinatariosSection (landing)', () => {
  it('explica que una cuenta gestiona varios destinatarios', () => {
    render(<MultiDestinatariosSection />);
    expect(
      screen.getByRole('heading', { name: /envía a diferentes personas desde una sola cuenta/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/sin crear cuentas adicionales/i)).toBeInTheDocument();
  });

  it('muestra casos personales y comerciales', () => {
    render(<MultiDestinatariosSection />);
    expect(screen.getByText('Compras personales')).toBeInTheDocument();
    expect(screen.getByText('Regalos')).toBeInTheDocument();
    expect(screen.getByText('Pequeños negocios')).toBeInTheDocument();
    expect(screen.getByText('Varias sucursales')).toBeInTheDocument();
  });

  it('el CTA "Crear mi cuenta" apunta a /registro (ruta pública)', () => {
    render(<MultiDestinatariosSection />);
    const cta = screen.getByRole('link', { name: /crear mi cuenta/i });
    expect(cta).toHaveAttribute('href', '/registro');
  });
});
