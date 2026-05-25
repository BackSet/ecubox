import { describe, expect, it } from 'vitest';
import {
  buildManualPresets,
  buildNumSacasQuickPresets,
  computeAutoDistribution,
  createDefaultDistribucionSacasState,
  parseManualDistribution,
  resolveDistributionForSubmit,
} from './saca-distribution';

describe('computeAutoDistribution', () => {
  it('puts all packages in one saca when numSacas is 1', () => {
    expect(
      computeAutoDistribution(5, { mode: 'numSacas', value: 1 }),
    ).toEqual([5]);
  });

  it('splits evenly with remainder on first sacas', () => {
    expect(
      computeAutoDistribution(5, { mode: 'numSacas', value: 2 }),
    ).toEqual([3, 2]);
  });

  it('computes sacas from max per saca', () => {
    expect(
      computeAutoDistribution(7, { mode: 'maxPorSaca', value: 3 }),
    ).toEqual([3, 2, 2]);
  });
});

describe('parseManualDistribution', () => {
  it('accepts valid manual input', () => {
    expect(parseManualDistribution('2,3', 5)).toEqual({
      ok: true,
      distribucion: [2, 3],
    });
  });

  it('rejects wrong sum', () => {
    expect(parseManualDistribution('2,2', 5).ok).toBe(false);
  });
});

describe('createDefaultDistribucionSacasState', () => {
  it('defaults to automatic with 1 saca', () => {
    expect(createDefaultDistribucionSacasState()).toEqual({
      tipo: 'automatica',
      manual: '',
      automaticaTipo: 'numSacas',
      automaticaNumSacas: 1,
      automaticaMaxPorSaca: 5,
    });
  });
});

describe('resolveDistributionForSubmit', () => {
  it('resolves automatic distribution', () => {
    const state = createDefaultDistribucionSacasState();
    expect(resolveDistributionForSubmit(4, state)).toEqual({
      ok: true,
      distribucion: [4],
    });
  });
});

describe('buildManualPresets', () => {
  it('includes 1 por saca preset', () => {
    const presets = buildManualPresets(3);
    expect(presets[0]?.label).toBe('1 por saca');
    expect(presets[0]?.value).toBe('1,1,1');
  });
});

describe('buildNumSacasQuickPresets', () => {
  it('always shows base chips 1, 2, 3, 5 even with one package', () => {
    const presets = buildNumSacasQuickPresets(1);
    expect(presets.map((p) => p.value)).toEqual([1, 2, 3, 5]);
    expect(presets.filter((p) => p.disabled).map((p) => p.value)).toEqual([2, 3, 5]);
  });

  it('adds 1-per-saca chip for counts outside the base set', () => {
    const presets = buildNumSacasQuickPresets(7);
    expect(presets.some((p) => p.value === 7 && p.label.includes('1 c/u'))).toBe(true);
  });
});
