import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Package } from 'lucide-react';
import { EstadosLeyendaDialog, type EstadoLeyendaItem } from './EstadosLeyendaDialog';

const items: EstadoLeyendaItem[] = [
  {
    key: 'REGISTRADO',
    label: 'Registrado',
    descripcion: 'Recibimos tu paquete en la bodega.',
    tone: 'info',
    icon: Package,
  },
  {
    key: 'EN_CAMINO',
    label: 'En camino',
    descripcion: 'Tu paquete viaja hacia el destino.',
    tone: 'primary',
  },
  {
    key: 'SIN_DESCRIPCION',
    label: 'Sin explicación',
    descripcion: null,
    tone: 'neutral',
  },
];

describe('EstadosLeyendaDialog', () => {
  afterEach(cleanup);

  it('renderiza el botón de ayuda con su aria-label y el diálogo cerrado', () => {
    render(
      <EstadosLeyendaDialog
        title="¿Qué significa cada estado?"
        items={items}
        triggerLabel="Ver leyenda de estados"
      />,
    );
    expect(screen.getByRole('button', { name: 'Ver leyenda de estados' })).toBeInTheDocument();
    expect(screen.queryByText('¿Qué significa cada estado?')).not.toBeInTheDocument();
  });

  it('al hacer click abre el diálogo con título, labels y descripciones en orden', async () => {
    const user = userEvent.setup();
    render(
      <EstadosLeyendaDialog
        title="¿Qué significa cada estado?"
        description="Intro de la leyenda"
        items={items}
        triggerLabel="Ver leyenda de estados"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver leyenda de estados' }));

    expect(screen.getByText('¿Qué significa cada estado?')).toBeInTheDocument();
    expect(screen.getByText('Intro de la leyenda')).toBeInTheDocument();
    const renderedItems = screen.getAllByRole('listitem');
    expect(renderedItems).toHaveLength(3);
    expect(renderedItems[0]).toHaveTextContent('Registrado');
    expect(renderedItems[0]).toHaveTextContent('Recibimos tu paquete en la bodega.');
    expect(renderedItems[1]).toHaveTextContent('En camino');
    expect(renderedItems[2]).toHaveTextContent('Sin explicación');
  });

  it('un item sin descripción solo muestra el badge', async () => {
    const user = userEvent.setup();
    render(
      <EstadosLeyendaDialog
        title="Leyenda"
        items={[items[2]]}
        triggerLabel="Ver leyenda de estados"
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver leyenda de estados' }));

    expect(screen.getByText('Sin explicación')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[0].querySelector('p')).toBeNull();
  });

  it('en estado de carga muestra el indicador y no los items', async () => {
    const user = userEvent.setup();
    render(
      <EstadosLeyendaDialog
        title="Leyenda"
        items={items}
        triggerLabel="Ver leyenda de estados"
        isLoading
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Ver leyenda de estados' }));

    expect(screen.getByRole('status')).toHaveTextContent('Cargando estados...');
    expect(screen.queryByRole('listitem')).not.toBeInTheDocument();
  });
});
