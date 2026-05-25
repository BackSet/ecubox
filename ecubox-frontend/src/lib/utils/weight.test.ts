import { describe, expect, it } from 'vitest';
import {
  formatWeightFromValues,
  formatWeightInline,
  kgToLbs,
  lbsToKg,
  normalizeWeight,
} from './weight';

describe('normalizeWeight', () => {
  it('returns null when both values are missing', () => {
    expect(normalizeWeight(undefined, null)).toBeNull();
  });

  it('infers kg from lbs', () => {
    expect(normalizeWeight(3, undefined)).toEqual({ lbs: 3, kg: lbsToKg(3) });
  });

  it('infers lbs from kg', () => {
    expect(normalizeWeight(null, 1.36)).toEqual({ lbs: kgToLbs(1.36), kg: 1.36 });
  });

  it('keeps both values when provided', () => {
    expect(normalizeWeight(3, 1.36)).toEqual({ lbs: 3, kg: 1.36 });
  });
});

describe('formatWeightInline', () => {
  it('formats lbs and kg on one line', () => {
    expect(formatWeightInline(3, 1.36)).toBe('3.00 lbs · 1.36 kg');
  });
});

describe('formatWeightFromValues', () => {
  it('returns null when weight is missing', () => {
    expect(formatWeightFromValues(undefined, undefined)).toBeNull();
  });

  it('formats from lbs only', () => {
    expect(formatWeightFromValues(3, null)).toBe(`3.00 lbs · ${lbsToKg(3).toFixed(2)} kg`);
  });
});

describe('formatWeightLbs', () => {
  it('uses two decimals via inline format', () => {
    expect(formatWeightInline(3, lbsToKg(3))).toContain('3.00 lbs');
  });
});
