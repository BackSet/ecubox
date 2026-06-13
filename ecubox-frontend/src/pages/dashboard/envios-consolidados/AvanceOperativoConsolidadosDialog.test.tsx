import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EnvioConsolidado } from '@/types/envio-consolidado';
import type { DestinoAvanceOperativo } from '@/lib/api/envios-consolidados.service';
import {
  AvanceOperativoConsolidadosDialog,
  esCandidatoAvanceOperativo,
} from './AvanceOperativoConsolidadosDialog';

const previewMutate = vi.hoisted(() => vi.fn());
const aplicarMutate = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useEnviosConsolidados', () => ({
  usePreviewAvanceOperativoConsolidados: () => ({
    mutateAsync: previewMutate,
    isPending: false,
    reset: vi.fn(),
  }),
  useAplicarAvanceOperativoConsolidados: () => ({
    mutateAsync: aplicarMutate,
    isPending: false,
    reset: vi.fn(),
  }),
}));

const candidatos: EnvioConsolidado[] = [
  { id: 1, codigo: 'PREP-1', cerrado: false, estadoOperativo: 'EN_PREPARACION', totalPaquetes: 2 },
  { id: 2, codigo: 'CERR-1', cerrado: true, estadoOperativo: 'CERRADO', totalPaquetes: 3 },
];

// El backend solo entrega como destinos los tres estados progresivos.
const destinos: DestinoAvanceOperativo[] = [
  { codigo: 'CERRADO', nombre: 'Cerrado' },
  { codigo: 'ENVIADO_DESDE_USA', nombre: 'Enviado desde USA' },
  { codigo: 'ARRIBADO_ECUADOR', nombre: 'Arribado a Ecuador' },
];

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: () => false,
  });
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: () => undefined,
  });
  Object.defineProperty(Element.prototype, 'scrollIntoView', {
    configurable: true,
    value: () => undefined,
  });
});

function renderDialog(seleccionInicial: number[] = []) {
  render(
    <AvanceOperativoConsolidadosDialog
      open
      consolidados={candidatos}
      seleccionInicial={seleccionInicial}
      destinos={destinos}
      consolidadosLoading={false}
      consolidadosError={false}
      destinosLoading={false}
      destinosError={false}
      onOpenChange={() => {}}
    />,
  );
}

describe('AvanceOperativoConsolidadosDialog', () => {
  beforeEach(() => {
    previewMutate.mockReset();
    aplicarMutate.mockReset();
  });
  afterEach(cleanup);

  it('solo considera candidatos en estados operativos origen válidos', () => {
    expect(esCandidatoAvanceOperativo(candidatos[0]!)).toBe(true);
    expect(esCandidatoAvanceOperativo(candidatos[1]!)).toBe(true);
    expect(
      esCandidatoAvanceOperativo({ id: 9, codigo: 'V', cerrado: false, estadoOperativo: 'VACIO', totalPaquetes: 0 }),
    ).toBe(false);
    expect(
      esCandidatoAvanceOperativo({ id: 8, codigo: 'B', cerrado: false, estadoOperativo: 'RECIBIDO_EN_BODEGA', totalPaquetes: 1 }),
    ).toBe(false);
  });

  it('el selector "Avanzar hasta" solo lista Cerrado, Enviado desde USA y Arribado a Ecuador', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole('combobox', { name: 'Avanzar hasta' }));

    expect(await screen.findByRole('option', { name: 'Cerrado' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Enviado desde USA' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Arribado a Ecuador' })).toBeInTheDocument();
    // No debe ofrecer estados excluidos del avance.
    expect(screen.queryByRole('option', { name: 'Recibido en bodega' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Liquidado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Cancelado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'En preparación' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Vacío' })).not.toBeInTheDocument();
  });

  it('muestra los pasos operativos intermedios en la vista previa', async () => {
    const user = userEvent.setup();
    previewMutate.mockResolvedValue({
      previewToken: 'tok',
      estadoDestino: { codigo: 'ARRIBADO_ECUADOR', nombre: 'Arribado a Ecuador' },
      pasos: [
        { codigo: 'CERRADO', nombre: 'Cerrado' },
        { codigo: 'ENVIADO_DESDE_USA', nombre: 'Enviado desde USA' },
        { codigo: 'ARRIBADO_ECUADOR', nombre: 'Arribado a Ecuador' },
      ],
      consolidados: [
        {
          id: 1,
          codigo: 'PREP-1',
          estadoOperativoActual: 'EN_PREPARACION',
          estadoOperativoFinal: 'ARRIBADO_ECUADOR',
          pasos: [
            { codigo: 'CERRADO', nombre: 'Cerrado' },
            { codigo: 'ENVIADO_DESDE_USA', nombre: 'Enviado desde USA' },
            { codigo: 'ARRIBADO_ECUADOR', nombre: 'Arribado a Ecuador' },
          ],
          version: 0,
        },
      ],
      resumen: { totalConsolidados: 1, totalPasos: 3 },
      advertencias: [],
    });
    renderDialog([1]);

    await user.click(screen.getByRole('combobox', { name: 'Avanzar hasta' }));
    await user.click(await screen.findByRole('option', { name: 'Arribado a Ecuador' }));
    await user.click(screen.getByRole('button', { name: 'Generar vista previa' }));

    // La vista previa muestra el resumen y los pasos operativos intermedios.
    expect(await screen.findByText(/paso\(s\) operativo\(s\)/)).toBeInTheDocument();
    // "Enviado desde USA" no está en el combobox (cerrado): solo aparece como paso intermedio.
    expect(screen.getAllByText('Enviado desde USA').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Aplicar 3 paso(s)' })).toBeEnabled();
  });
});
