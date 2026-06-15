import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { RecipientShipmentSummary, formatConteosEnvios } from './RecipientShipmentSummary';

afterEach(cleanup);

describe('RecipientShipmentSummary', () => {
  it('formatConteosEnvios usa una sola representación "N guías · N paquetes"', () => {
    expect(formatConteosEnvios(12, 9)).toBe('12 guías · 9 paquetes');
    expect(formatConteosEnvios(1, 1)).toBe('1 guía · 1 paquete');
    expect(formatConteosEnvios(0, 0)).toBe('0 guías · 0 paquetes');
    expect(formatConteosEnvios(null, undefined)).toBe('0 guías · 0 paquetes');
  });

  it('muestra conteos y CTA "Ver envíos" que dispara la acción', () => {
    const onView = vi.fn();
    render(<RecipientShipmentSummary totalGuias={12} totalPaquetes={9} onViewShipments={onView} />);
    expect(screen.getByText('12 guías · 9 paquetes')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /ver envíos/i }));
    expect(onView).toHaveBeenCalledTimes(1);
  });

  it('en modo compact el CTA ocupa el ancho completo (pie de card)', () => {
    render(<RecipientShipmentSummary totalGuias={3} totalPaquetes={7} onViewShipments={vi.fn()} compact />);
    expect(screen.getByRole('button', { name: /ver envíos/i }).className).toContain('w-full');
  });
});
