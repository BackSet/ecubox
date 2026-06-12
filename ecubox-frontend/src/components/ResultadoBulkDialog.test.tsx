import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { ResultadoBulkDialog } from './ResultadoBulkDialog';

const rechazados = [
  { codigo: 'TB-1', motivo: 'Ya está en estado terminal.' },
  { codigo: 'TB-2', motivo: 'Tiene 2 piezas despachadas; no se puede cancelar.' },
];

describe('ResultadoBulkDialog', () => {
  afterEach(cleanup);

  it('muestra conteos y la tabla de rechazados con código y motivo', () => {
    render(
      <ResultadoBulkDialog
        open
        onOpenChange={() => {}}
        accionLabel="Cancelar guía"
        unidadSingular="guía master"
        unidadPlural="guías master"
        procesadas={3}
        rechazados={rechazados}
      />,
    );

    expect(screen.getByText('Acción aplicada parcialmente')).toBeInTheDocument();
    expect(screen.getByText(/Cancelar guía/)).toBeInTheDocument();
    expect(screen.getByText('Aplicada a 3 guías master')).toBeInTheDocument();
    expect(screen.getByText('Sin aplicar en 2 guías master')).toBeInTheDocument();
    expect(screen.getByText('TB-1')).toBeInTheDocument();
    expect(screen.getByText('Ya está en estado terminal.')).toBeInTheDocument();
    expect(screen.getByText('TB-2')).toBeInTheDocument();
    expect(
      screen.getByText('Tiene 2 piezas despachadas; no se puede cancelar.'),
    ).toBeInTheDocument();
  });

  it('con cero procesadas indica fracaso total y singulariza unidades', () => {
    render(
      <ResultadoBulkDialog
        open
        onOpenChange={() => {}}
        accionLabel="Enviar desde USA"
        unidadSingular="envío consolidado"
        unidadPlural="envíos consolidados"
        procesadas={0}
        rechazados={[{ codigo: 'ENV-1', motivo: 'No está cerrado.' }]}
      />,
    );

    expect(screen.getByText('No se aplicó a ningún elemento')).toBeInTheDocument();
    expect(screen.getByText('Aplicada a 0 envíos consolidados')).toBeInTheDocument();
    expect(screen.getByText('Sin aplicar en 1 envío consolidado')).toBeInTheDocument();
  });
});
