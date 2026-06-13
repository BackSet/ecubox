import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Select, SelectTrigger, SelectValue } from './select';

/**
 * Defensa estructural responsive del Select compartido. JSDOM no mide píxeles,
 * pero sí verifica que las clases que permiten encoger/truncar estén presentes:
 * `min-w-0` evita que el valor empuje el ancho del contenedor (causa raíz del
 * overflow en /parametros-sistema/por-punto) y `max-w-full` lo contiene.
 */
describe('SelectTrigger — contención responsive', () => {
  it('puede encoger y contenerse en flex/grid (min-w-0 + max-w-full)', () => {
    render(
      <Select>
        <SelectTrigger aria-label="Estado">
          <SelectValue placeholder="Seleccionar estado..." />
        </SelectTrigger>
      </Select>,
    );
    const trigger = screen.getByRole('combobox', { name: 'Estado' });
    expect(trigger.className).toContain('min-w-0');
    expect(trigger.className).toContain('max-w-full');
    // el slot del valor debe poder truncar (min-w-0 + line-clamp)
    expect(trigger.className).toContain('*:data-[slot=select-value]:min-w-0');
  });
});
