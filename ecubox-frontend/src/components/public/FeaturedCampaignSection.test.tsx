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
    render(<FeaturedCampaignSection campania={base} tema="light" />);
    expect(screen.getByRole('heading', { name: '20% de descuento' })).toBeInTheDocument();
    expect(screen.getByText('Nuevo')).toBeInTheDocument();
    expect(screen.getByText('Aprovecha esta semana.')).toBeInTheDocument();
  });

  it('no renderiza nada sin título', () => {
    const { container } = render(<FeaturedCampaignSection campania={{ titulo: '' }} tema="light" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('no renderiza nada con datos nulos (patrón vacío / fallo API)', () => {
    const { container } = render(<FeaturedCampaignSection campania={null} tema="light" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('CTA externo abre en nueva pestaña con rel seguro', () => {
    render(
      <FeaturedCampaignSection
        campania={{ ...base, textoCta: 'Ver', urlCta: 'https://x.com', tipoDestinoCta: 'EXTERNO' }}
        tema="light"
      />,
    );
    const cta = screen.getByRole('link', { name: /ver/i });
    expect(cta).toHaveAttribute('href', 'https://x.com');
    expect(cta).toHaveAttribute('target', '_blank');
    expect(cta).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('resuelve la imagen por tema (clara en light, oscura en dark)', () => {
    const conImagenes: CampaniaLandingPublic = {
      ...base,
      imagenUrlClaro: 'https://cdn.x/claro.png',
      imagenUrlOscuro: 'https://cdn.x/oscuro.png',
      textoAlternativoImagen: 'Banner',
    };
    const { rerender } = render(<FeaturedCampaignSection campania={conImagenes} tema="light" />);
    expect((screen.getByAltText('Banner') as HTMLImageElement).src).toContain('claro.png');
    rerender(<FeaturedCampaignSection campania={conImagenes} tema="dark" />);
    expect((screen.getByAltText('Banner') as HTMLImageElement).src).toContain('oscuro.png');
  });

  it('fallback bidireccional: en oscuro usa la clara si falta la oscura', () => {
    render(
      <FeaturedCampaignSection
        campania={{ ...base, imagenUrlClaro: 'https://cdn.x/claro.png', textoAlternativoImagen: 'B' }}
        tema="dark"
      />,
    );
    expect((screen.getByAltText('B') as HTMLImageElement).src).toContain('claro.png');
  });

  it('imagen lazy/async y, al fallar, se oculta sin icono roto', () => {
    render(
      <FeaturedCampaignSection
        campania={{ ...base, imagenUrlClaro: 'https://cdn.x/a.png', textoAlternativoImagen: 'Banner' }}
        tema="light"
      />,
    );
    const img = screen.getByAltText('Banner') as HTMLImageElement;
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    fireEvent.error(img);
    expect(screen.queryByAltText('Banner')).not.toBeInTheDocument();
  });

  it('sin imagen no deja columna vacía (composición centrada)', () => {
    render(<FeaturedCampaignSection campania={base} tema="light" />);
    // No hay <img>; el bloque de contenido sigue presente.
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '20% de descuento' })).toBeInTheDocument();
  });
});
