import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GuiaTrackingHelp } from './GuiaTrackingHelp';
import {
  EJEMPLO_AMAZON,
  EJEMPLO_SHEIN,
  GUIA_TRACKING_MENSAJE_DIVIDIDO,
  GUIA_TRACKING_MENSAJE_PRINCIPAL,
  pareceNumeroPedido,
} from './guiaTrackingHelpContent';

afterEach(cleanup);

describe('GuiaTrackingHelp · variante resumen', () => {
  it('muestra el mensaje principal y el botón "Ver ejemplos"', () => {
    render(<GuiaTrackingHelp variant="resumen" />);
    expect(screen.getByText('¿Cómo encuentro el número de guía?')).toBeInTheDocument();
    expect(screen.getByText(GUIA_TRACKING_MENSAJE_PRINCIPAL)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /ver ejemplos/i })).toBeInTheDocument();
  });

  it('abre el detalle en un diálogo al pulsar "Ver ejemplos" y permite cerrarlo', async () => {
    const user = userEvent.setup();
    render(<GuiaTrackingHelp variant="resumen" />);
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: /ver ejemplos/i }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('¿Cómo encuentro el número de guía?')).toBeInTheDocument();

    // Cierre con Escape y retorno de foco al disparador.
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    expect(screen.getByRole('button', { name: /ver ejemplos/i })).toHaveFocus();
  });
});

describe('GuiaTrackingHelp · variante inline', () => {
  it('expone el disparador "¿No sabes cuál número ingresar?" accesible por teclado', async () => {
    const user = userEvent.setup();
    render(<GuiaTrackingHelp variant="inline" />);
    const trigger = screen.getByRole('button', { name: /no sabes cuál número ingresar/i });

    await user.tab();
    expect(trigger).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

describe('GuiaTrackingHelp · contenido detallado', () => {
  it('diferencia número de pedido y número de guía', () => {
    render(<GuiaTrackingHelp variant="detalle" />);
    // Aparece en las listas correctas/incorrectas.
    expect(screen.getAllByText('Número de rastreo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Número de pedido').length).toBeGreaterThan(0);
    expect(screen.getByText('Número de factura')).toBeInTheDocument();
    expect(screen.getByText('SKU')).toBeInTheDocument();
  });

  it('explica el caso de compra dividida en varios paquetes', () => {
    render(<GuiaTrackingHelp variant="detalle" />);
    expect(screen.getByText(GUIA_TRACKING_MENSAJE_DIVIDIDO)).toBeInTheDocument();
  });

  it('muestra ejemplos ficticios de Amazon y SHEIN', () => {
    render(<GuiaTrackingHelp variant="detalle" />);
    expect(screen.getByText('Amazon')).toBeInTheDocument();
    expect(screen.getByText('SHEIN')).toBeInTheDocument();
    // Códigos correctos ficticios.
    expect(screen.getByText(EJEMPLO_AMAZON.ejemplosCorrectos[0])).toBeInTheDocument();
    expect(screen.getByText(EJEMPLO_SHEIN.ejemplosCorrectos[0])).toBeInTheDocument();
    // El número de pedido se muestra como ejemplo INCORRECTO, no como guía.
    expect(screen.getByText(EJEMPLO_AMAZON.ejemploIncorrecto.valor)).toBeInTheDocument();
    expect(screen.getByText(EJEMPLO_SHEIN.ejemploIncorrecto.valor)).toBeInTheDocument();
  });
});

describe('heurística pareceNumeroPedido', () => {
  it('detecta el patrón de número de pedido de Amazon', () => {
    expect(pareceNumeroPedido('114-1234567-1234567')).toBe(true);
    expect(pareceNumeroPedido('Pedido # 114-1234567-1234567')).toBe(true);
  });

  it('no marca números de guía válidos de distintos transportistas', () => {
    expect(pareceNumeroPedido('1Z999AA10123456784')).toBe(false); // UPS
    expect(pareceNumeroPedido('TBA123456789000')).toBe(false); // Amazon Logistics
    expect(pareceNumeroPedido('9400111899223817428490')).toBe(false); // USPS
    expect(pareceNumeroPedido('YT2412345678901234')).toBe(false);
    expect(pareceNumeroPedido('123-456-789')).toBe(false); // longitudes distintas
    expect(pareceNumeroPedido('')).toBe(false);
  });
});
