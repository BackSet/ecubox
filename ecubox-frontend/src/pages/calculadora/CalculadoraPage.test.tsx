import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalculadoraPage } from './CalculadoraPage';

const mocks = vi.hoisted(() => ({
  copyText: vi.fn(),
  snapshotNodeToPdf: vi.fn(),
  snapshotToBlob: vi.fn(),
  downloadPdf: vi.fn(),
  downloadBlob: vi.fn(),
  copyImageBlobToClipboard: vi.fn(),
  notifyRun: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/lib/api/tarifa-calculadora.service', () => ({
  getTarifaCalculadoraPublic: vi.fn().mockResolvedValue({ tarifaPorLibra: 5 }),
}));

vi.mock('@/lib/clipboard', () => ({
  copyText: mocks.copyText,
}));

vi.mock('@/lib/exporters/domSnapshot', () => ({
  snapshotNodeToPdf: mocks.snapshotNodeToPdf,
  snapshotToBlob: mocks.snapshotToBlob,
  downloadBlob: mocks.downloadBlob,
  copyImageBlobToClipboard: mocks.copyImageBlobToClipboard,
}));

vi.mock('@/lib/notify', () => ({
  notify: {
    run: mocks.notifyRun,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
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

async function renderCotizacion(preset = '5 lbs') {
  const user = userEvent.setup();
  render(<CalculadoraPage />);
  await user.click(await screen.findByRole('button', { name: preset }));
  await screen.findByRole('button', { name: 'Copiar texto' });
  return user;
}

describe('CalculadoraPage actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.copyText.mockResolvedValue(undefined);
    mocks.snapshotToBlob.mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    mocks.copyImageBlobToClipboard.mockResolvedValue(undefined);
    mocks.snapshotNodeToPdf.mockResolvedValue({
      download: mocks.downloadPdf,
      print: vi.fn(),
      blob: vi.fn(),
    });
    mocks.notifyRun.mockImplementation(async (promise: Promise<unknown>) => promise);
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined });
  });

  afterEach(cleanup);

  it('copia como texto la cotización completa', async () => {
    const user = await renderCotizacion('2 lbs');

    await user.click(screen.getByRole('button', { name: 'Copiar texto' }));
    const copiedText = mocks.copyText.mock.calls[0]?.[0] as string;

    expect(copiedText).toContain('Peso ingresado: 2 lbs');
    expect(copiedText).toContain('Equivalencia:');
    expect(copiedText).toContain('Tarifa:');
    expect(copiedText).toContain('Subtotal:');
    expect(copiedText).toContain('Recargo por envío menor a 4 lbs:');
    expect(copiedText).toContain('Total estimado:');
    expect(copiedText).toContain('Moneda: USD');
    expect(copiedText).toContain('Aviso:');
  });

  it('comparte un archivo PNG cuando Web Share acepta archivos', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const canShare = vi.fn().mockReturnValue(true);
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: canShare });
    const user = await renderCotizacion('2 lbs');

    await user.click(screen.getByRole('button', { name: 'Compartir imagen' }));

    expect(mocks.snapshotToBlob).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      'png',
      expect.any(Object),
    );
    const shareData = share.mock.calls[0]?.[0] as ShareData;
    expect(canShare).toHaveBeenCalledWith(shareData);
    expect(shareData.files).toHaveLength(1);
    expect(shareData.files?.[0]).toBeInstanceOf(File);
    expect(shareData.files?.[0]?.name).toMatch(/^cotizacion-ecubox-\d{8}\.png$/);
    expect(shareData.text).toContain('Total estimado:');
    expect(mocks.copyText).not.toHaveBeenCalled();
    expect(mocks.downloadBlob).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Cotización compartida como imagen');
  });

  it('descarga la imagen como fallback si el navegador no comparte archivos', async () => {
    const user = await renderCotizacion();

    await user.click(screen.getByRole('button', { name: 'Compartir imagen' }));

    expect(mocks.downloadBlob).toHaveBeenCalledWith(
      expect.any(Blob),
      expect.stringMatching(/^cotizacion-ecubox-\d{8}\.png$/),
    );
    expect(mocks.copyText).not.toHaveBeenCalled();
    expect(mocks.toastSuccess).toHaveBeenCalledWith('Imagen descargada para compartir');
  });

  it('no muestra error ni descarga cuando el usuario cancela Compartir', async () => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: vi.fn().mockRejectedValue(new DOMException('Cancelado', 'AbortError')),
    });
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    });
    const user = await renderCotizacion();

    await user.click(screen.getByRole('button', { name: 'Compartir imagen' }));

    expect(mocks.toastError).not.toHaveBeenCalled();
    expect(mocks.downloadBlob).not.toHaveBeenCalled();
  });

  it('permite descargar o copiar la cotización como imagen', async () => {
    const user = await renderCotizacion('2 lbs');

    await user.click(screen.getByRole('button', { name: 'Opciones de imagen' }));
    await user.click(screen.getByRole('menuitem', { name: /Descargar PNG/ }));
    await waitFor(() => expect(mocks.downloadBlob).toHaveBeenCalled());

    await user.click(screen.getByRole('button', { name: 'Opciones de imagen' }));
    await user.click(screen.getByRole('menuitem', { name: /Copiar imagen/ }));
    await waitFor(() =>
      expect(mocks.copyImageBlobToClipboard).toHaveBeenCalledWith(expect.any(Blob)),
    );
  });

  it('exporta la tarjeta completa y excluye sus controles', async () => {
    const user = await renderCotizacion('2 lbs');

    await user.click(screen.getByRole('button', { name: 'Exportar completo' }));

    await waitFor(() => expect(mocks.snapshotNodeToPdf).toHaveBeenCalled());
    const [node, filename, options] = mocks.snapshotNodeToPdf.mock.calls[0] as [
      HTMLElement,
      string,
      Record<string, unknown>,
    ];

    const visibleNode = document.querySelector('[data-calculadora-export-root]');
    expect(node).not.toBe(visibleNode);
    expect(node).toHaveAttribute('data-calculadora-export-root');
    expect(node).toHaveAttribute('aria-hidden', 'true');
    expect(node).toHaveClass('tracking-export-capture');
    expect(node.style.left).toBe('-10000px');
    expect(node.isConnected).toBe(false);
    expect(visibleNode).not.toHaveClass('tracking-export-capture');
    expect(node).toHaveTextContent('Costo estimado total');
    expect(node).toHaveTextContent('Recargo envío');
    expect(node).toHaveTextContent('Total estimado');
    expect(node).toHaveTextContent('Moneda: USD');
    expect(node).toHaveTextContent('Este valor es referencial');
    expect(node.querySelector('[data-export-exclude]')).not.toBeNull();
    expect(filename).toMatch(/^cotizacion-ecubox-\d{8}\.pdf$/);
    expect(options).toEqual(
      expect.objectContaining({
        orientation: 'portrait',
        footerLeft: 'ECUBOX · Cotización de envío',
      }),
    );
    expect(mocks.downloadPdf).toHaveBeenCalled();
  });

  it('restaura el control cuando falla la exportación', async () => {
    mocks.snapshotNodeToPdf.mockRejectedValue(new Error('Snapshot unavailable'));
    const user = await renderCotizacion();
    const exportButton = screen.getByRole('button', { name: 'Exportar completo' });

    await user.click(exportButton);

    await waitFor(() => expect(exportButton).toBeEnabled());
    expect(mocks.notifyRun).toHaveBeenCalledWith(
      expect.any(Promise),
      expect.objectContaining({
        loading: 'Generando cotización completa...',
        success: 'Cotización descargada',
        error: expect.any(Function),
      }),
    );
  });

  it('muestra error cuando no puede copiar', async () => {
    mocks.copyText.mockRejectedValue(new Error('Clipboard unavailable'));
    const user = await renderCotizacion();

    await user.click(screen.getByRole('button', { name: 'Copiar texto' }));

    expect(mocks.toastError).toHaveBeenCalledWith('No se pudo copiar');
  });
});
