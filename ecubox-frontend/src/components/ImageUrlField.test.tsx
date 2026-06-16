import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ImageUrlField } from './ImageUrlField';

afterEach(cleanup);

describe('ImageUrlField', () => {
  it('sin valor muestra el placeholder "Sin imagen" (no icono roto)', () => {
    render(<ImageUrlField label="Imagen" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Sin imagen')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('con URL muestra preview lazy/async y permite limpiar', () => {
    const onChange = vi.fn();
    render(<ImageUrlField label="Imagen" value="https://x/a.png" onChange={onChange} alt="Banner" />);
    const img = screen.getByAltText('Banner') as HTMLImageElement;
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    fireEvent.click(screen.getByRole('button', { name: /limpiar/i }));
    expect(onChange).toHaveBeenCalledWith('');
  });

  it('si la imagen falla muestra "No se pudo cargar" (fallback controlado)', () => {
    render(<ImageUrlField label="Imagen" value="https://x/roto.png" onChange={vi.fn()} alt="B" />);
    fireEvent.error(screen.getByAltText('B'));
    expect(screen.getByText('No se pudo cargar la imagen')).toBeInTheDocument();
  });

  it('muestra el error cuando se provee', () => {
    render(<ImageUrlField label="Imagen" value="http://x" onChange={vi.fn()} error="Debe ser HTTPS" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Debe ser HTTPS');
  });
});
