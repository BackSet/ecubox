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
  {
    id: 4,
    codigo: 'RECIBIDO-1',
    cerrado: true,
    estadoOperativo: 'RECIBIDO_EN_BODEGA',
    totalPaquetes: 3,
  },
  {
    id: 5,
    codigo: 'CERRADO-1',
    cerrado: true,
    estadoOperativo: 'CERRADO',
    totalPaquetes: 2,
  },
  {
    id: 6,
    codigo: 'ENVIADO-1',
    cerrado: true,
    estadoOperativo: 'ENVIADO_DESDE_USA',
    totalPaquetes: 1,
  },
  {
    id: 7,
    codigo: 'ARRIBADO-1',
    cerrado: true,
    estadoOperativo: 'ARRIBADO_ECUADOR',
    totalPaquetes: 1,
  },
];

const transicionCierre = {
  id: 'CERRADO',
  codigo: 'CERRADO',
  etiqueta: 'Cerrado',
  orden: 20,
  estadoPrevioRequerido: 'EN_PREPARACION' as const,
  estadoResultante: 'CERRADO' as const,
  estadoAplicadoPaquetes: {
    id: 20,
    codigo: 'MANIFESTADO',
    nombre: 'Manifestado',
    orden: 20,
  },
  disponible: true,
  tipo: 'REQUERIDA' as const,
  requisitos: [],
  permiso: 'ENVIOS_CONSOLIDADOS_UPDATE',
};
const transicionEnvio = {
  ...transicionCierre,
  id: 'ENVIADO_DESDE_USA',
  codigo: 'ENVIADO_DESDE_USA',
  etiqueta: 'Enviado desde usa',
  orden: 40,
  estadoPrevioRequerido: 'CERRADO' as const,
  estadoResultante: 'ENVIADO_DESDE_USA' as const,
  estadoAplicadoPaquetes: {
    id: 40,
    codigo: 'ENVIADO_USA',
    nombre: 'Enviado desde USA',
    orden: 40,
  },
};
const transicionArribo = {
  ...transicionCierre,
  id: 'ARRIBADO_ECUADOR',
  codigo: 'ARRIBADO_ECUADOR',
  etiqueta: 'Arribado ecuador',
  orden: 60,
  estadoPrevioRequerido: 'ENVIADO_DESDE_USA' as const,
  estadoResultante: 'ARRIBADO_ECUADOR' as const,
  estadoAplicadoPaquetes: {
    id: 60,
    codigo: 'ARRIBADO_EC',
    nombre: 'Arribado a Ecuador',
    orden: 60,
  },
};
const transiciones = [transicionCierre, transicionEnvio, transicionArribo];

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
      transiciones={transiciones}
      consolidadosLoading={false}
      consolidadosError={false}
      transicionesLoading={false}
      transicionesError={false}
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
    expect(esCandidatoAvanceEstados(candidatos[3]!)).toBe(false);
    expect(esCandidatoAvanceEstados(candidatos[4]!)).toBe(true);
    expect(esCandidatoAvanceEstados(candidatos[5]!)).toBe(true);
    expect(esCandidatoAvanceEstados(candidatos[6]!)).toBe(false);
  });

  it('lista inmediatamente los elegibles y excluye estados gestionados en otros puntos', () => {
    renderDialog();

    expect(screen.getByText('PREP-1')).toBeInTheDocument();
    expect(screen.getByText('CERRADO-1')).toBeInTheDocument();
    expect(screen.getByText('ENVIADO-1')).toBeInTheDocument();
    expect(screen.queryByText('VACIO-1')).not.toBeInTheDocument();
    expect(screen.queryByText('RECIBIDO-1')).not.toBeInTheDocument();
    expect(screen.queryByText('ARRIBADO-1')).not.toBeInTheDocument();
  });

  it('el primer consolidado bloquea los que tienen otro estado inicial', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByText('PREP-1'));

    expect(
      screen.getAllByText('Selecciona consolidados en En preparación.'),
    ).toHaveLength(2);
    expect(screen.getAllByRole('checkbox').filter((item) => item.hasAttribute('disabled')))
      .toHaveLength(2);
  });

  it('calcula Hasta desde el estado operativo del consolidado seleccionado', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByText('CERRADO-1'));
    await user.click(screen.getByRole('combobox', { name: 'Hasta' }));

    expect(screen.queryByRole('option', { name: 'Cerrado' })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Enviado desde usa' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Arribado ecuador' })).toBeInTheDocument();
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

    await user.click(screen.getByRole('combobox', { name: 'Hasta' }));
    await user.click(await screen.findByRole('option', { name: 'Cerrado' }));
    await user.click(screen.getByRole('button', { name: 'Generar vista previa' }));

    expect(
      await screen.findByText(
        'El consolidado debe contener al menos un paquete para cambiar de estado.',
      ),
    ).toBeInTheDocument();
  });
});
