import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EnvioConsolidado } from '@/types/envio-consolidado';
import {
  AvanceEstadosConsolidadosDialog,
  esCandidatoAvanceEstados,
} from './AvanceEstadosConsolidadosDialog';

const previewMutate = vi.hoisted(() => vi.fn());
const aplicarMutate = vi.hoisted(() => vi.fn());

vi.mock('@/hooks/useEnviosConsolidados', () => ({
  usePreviewAvanceEstadosConsolidados: () => ({
    mutateAsync: previewMutate,
    isPending: false,
    reset: vi.fn(),
  }),
  useAplicarAvanceEstadosConsolidados: () => ({
    mutateAsync: aplicarMutate,
    isPending: false,
    reset: vi.fn(),
  }),
}));

const candidatos: EnvioConsolidado[] = [
  {
    id: 1,
    codigo: 'PREP-1',
    cerrado: false,
    estadoOperativo: 'EN_PREPARACION',
    totalPaquetes: 2,
  },
  {
    id: 2,
    codigo: 'VACIO-1',
    cerrado: false,
    estadoOperativo: 'VACIO',
    totalPaquetes: 0,
  },
  {
    id: 3,
    codigo: 'SIN-ESTADO',
    cerrado: false,
    totalPaquetes: 1,
  },
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
    <AvanceEstadosConsolidadosDialog
      open
      consolidados={candidatos}
      seleccionInicial={seleccionInicial}
      estadosDestino={[
        {
          id: 20,
          codigo: 'CERRADO',
          nombre: 'Cerrado',
          ordenTracking: 20,
          activo: true,
        },
      ]}
      consolidadosLoading={false}
      consolidadosError={false}
      estadosLoading={false}
      estadosError={false}
      onOpenChange={() => {}}
    />,
  );
}

describe('AvanceEstadosConsolidadosDialog', () => {
  beforeEach(() => {
    previewMutate.mockReset();
    aplicarMutate.mockReset();
  });
  afterEach(cleanup);

  it('excluye consolidados vacíos, sin estado y fuera del flujo válido', () => {
    expect(esCandidatoAvanceEstados(candidatos[0]!)).toBe(true);
    expect(esCandidatoAvanceEstados(candidatos[1]!)).toBe(false);
    expect(esCandidatoAvanceEstados(candidatos[2]!)).toBe(false);
  });

  it('muestra el candidato como En preparación y oculta los inválidos', () => {
    renderDialog();

    expect(screen.getByText('PREP-1')).toBeInTheDocument();
    expect(screen.getByText('En preparación')).toBeInTheDocument();
    expect(screen.queryByText('VACIO-1')).not.toBeInTheDocument();
    expect(screen.queryByText('SIN-ESTADO')).not.toBeInTheDocument();
  });

  it('mantiene deshabilitada la aplicación sin selección ni preview', () => {
    renderDialog();

    expect(screen.getByRole('button', { name: 'Aplicar 0 paso(s)' })).toBeDisabled();
  });

  it('muestra el mensaje de negocio devuelto por backend', async () => {
    const user = userEvent.setup();
    previewMutate.mockRejectedValue({
      response: {
        data: {
          message: 'El consolidado debe contener al menos un paquete para cambiar de estado.',
        },
      },
    });
    renderDialog([1]);

    await user.click(screen.getByRole('combobox', { name: 'Avanzar hasta' }));
    await user.click(await screen.findByRole('option', { name: 'Cerrado' }));
    await user.click(screen.getByRole('button', { name: 'Generar vista previa' }));

    expect(
      await screen.findByText(
        'El consolidado debe contener al menos un paquete para cambiar de estado.',
      ),
    ).toBeInTheDocument();
  });
});
