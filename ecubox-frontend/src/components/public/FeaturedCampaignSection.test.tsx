import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FeaturedCampaignSection } from './FeaturedCampaignSection';
import type { CampaniaLandingPublic } from '@/types/campania-landing';

afterEach(cleanup);

const base: CampaniaLandingPublic = {
  tipo: 'OFERTA',
  etiqueta: 'Nuevo',
  titulo: '20% de descuento',
  descripcion: 'Aprovecha esta semana.',
};

describe('FeaturedCampaignSection', () => {
  it('renderiza título, etiqueta y descripción', () => {
    render(<FeaturedCampaignSection campania={base} />);
    expect(screen.getByRole('heading', { name: '20% de descuento' })).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
    expect(screen.getByText('Aprovecha esta semana.')).toBeInTheDocument();
  });

  it('no renderiza nada sin título (sin reservar espacio ni error)', () => {
    const { container } = render(<FeaturedCampaignSection campania={{ titulo: '' }} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('no renderiza nada con datos nulos (patrón vacío / fallo API)', () => {
    const { container } = render(<FeaturedCampaignSection campania={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('CTA externo abre en nueva pestaña con rel seguro', () => {
    render(
      <FeaturedCampaignSection
        campania={{ ...base, textoCta: 'Ver', urlCta: 'https://x.com', tipoDestinoCta: 'EXTERNO' }}
      />,
    );
    const cta = screen.getByRole('link', { name: /ver/i });
    expect(cta).toHaveAttribute('href', 'https://x.com');
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('CTA interno no abre en nueva pestaña', () => {
    render(
      <FeaturedCampaignSection
        campania={{ ...base, textoCta: 'Crear cuenta', urlCta: '/registro', tipoDestinoCta: 'INTERNO' }}
      />,
    );
    const cta = screen.getByRole('link', { name: /crear cuenta/i });
    expect(cta).toHaveAttribute('href', '/registro');
    expect(cta).not.toHaveAttribute('target');
  });

  it('imagen externa es lazy/async con alt y cae a fallback al fallar', () => {
    render(
      <FeaturedCampaignSection
        campania={{ ...base, imagenUrl: 'https://cdn.x.com/a.png', textoAlternativoImagen: 'Banner promo' }}
      />,
    );
    const img = screen.getByAltText('Banner promo') as HTMLImageElement;
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    // Al fallar la imagen, deja de renderizarse (fallback sin layout shift).
    fireEvent.error(img);
    expect(screen.queryByAltText('Banner promo')).not.toBeInTheDocument();
  });
});
