import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculadoraPage } from './CalculadoraPage';

const mocks = vi.hoisted(() => ({
  handleShare: vi.fn(),
  handleCopyTexto: vi.fn(),
  handleDownloadPdf: vi.fn(),
  handlePrintPdf: vi.fn(),
  handleDownloadImage: vi.fn(),
  handleCopyImage: vi.fn(),
}));

vi.mock('@/lib/api/tarifa-calculadora.service', () => ({
  getTarifaCalculadoraPublic: vi.fn().mockResolvedValue({ tarifaPorLibra: 5 }),
}));

vi.mock('@/pages/calculadora/useCotizacionExport', () => ({
  useCotizacionExport: () => mocks,
}));

vi.mock('@/components/public/PublicPageLayout', () => ({
  PublicPageLayout: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));

vi.mock('@/components/public/PublicPageHero', () => ({
  PublicPageHero: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/components/public/PublicSupportStrip', () => ({
  PublicSupportStrip: () => null,
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

async function renderCotizacion() {
  const user = userEvent.setup();
  render(<CalculadoraPage />);
  await user.click(await screen.findByRole('button', { name: '5 lbs' }));
  await screen.findByRole('heading', { name: 'Compartir y exportar' });
  return user;
}

describe('CalculadoraPage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handleShare.mockResolvedValue('shared-text');
  });

  afterEach(cleanup);

  it('muestra el panel de acciones al calcular una cotización', async () => {
    await renderCotizacion();

    expect(screen.getByRole('button', { name: 'Compartir cotización' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Copiar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: /PDFDocumento o vista de pantalla/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /ImagenPNG, JPEG o portapapeles/ })).toBeEnabled();
  });

  it('delega compartir y copiar al hook de exportación', async () => {
    const user = await renderCotizacion();

    await user.click(screen.getByRole('button', { name: 'Compartir cotización' }));
    await user.click(screen.getByRole('button', { name: 'Copiar' }));

    expect(mocks.handleShare).toHaveBeenCalledOnce();
    expect(mocks.handleCopyTexto).toHaveBeenCalledOnce();
  });

  it('usa documento PDF y PNG como acciones primarias', async () => {
    const user = await renderCotizacion();

    await user.click(screen.getByRole('button', { name: /PDFDocumento o vista de pantalla/ }));
    await user.click(
      screen.getByRole('button', { name: /ImagenPNG, JPEG o portapapeles/ }),
    );

    expect(mocks.handleDownloadPdf).toHaveBeenCalledWith('documento');
    expect(mocks.handleDownloadImage).toHaveBeenCalledWith('png');
  });
});
