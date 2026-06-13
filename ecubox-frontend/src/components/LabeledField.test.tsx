import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LabeledField } from './LabeledField';

describe('LabeledField', () => {
  it('anuncia el error de validación con role="alert"', () => {
    render(
      <LabeledField label="Nombre" required error="El nombre es obligatorio">
        <input aria-label="Nombre" />
      </LabeledField>,
    );
    const alerta = screen.getByRole('alert');
    expect(alerta).toHaveTextContent('El nombre es obligatorio');
  });

  it('muestra el hint cuando no hay error y no expone una alerta', () => {
    render(
      <LabeledField label="Nombre" hint="Tal como aparece en cédula">
        <input aria-label="Nombre" />
      </LabeledField>,
    );
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText('Tal como aparece en cédula')).toBeInTheDocument();
  });
});
