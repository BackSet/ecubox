import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SEARCH,
  exclusiveEnd,
  normalizeSearch,
  searchToApiParams,
} from './periodo';

describe('normalizeSearch', () => {
  it('falls back to the safe default preset for invalid presets', () => {
    expect(normalizeSearch({ preset: 'no-existe' })).toEqual(DEFAULT_SEARCH);
    expect(normalizeSearch({})).toEqual(DEFAULT_SEARCH);
  });

  it('keeps simple presets', () => {
    expect(normalizeSearch({ preset: 'este-mes' })).toEqual({ preset: 'este-mes', gran: undefined });
  });

  it('validates mes/año and falls back when invalid', () => {
    expect(normalizeSearch({ preset: 'mes', anio: 2026, mes: 6 })).toEqual({
      preset: 'mes',
      anio: 2026,
      mes: 6,
      gran: undefined,
    });
    expect(normalizeSearch({ preset: 'mes', anio: 2026, mes: 13 })).toEqual(DEFAULT_SEARCH);
    expect(normalizeSearch({ preset: 'mes' })).toEqual(DEFAULT_SEARCH);
  });

  it('validates custom range and rejects desde > hasta', () => {
    expect(normalizeSearch({ preset: 'rango', desde: '2026-01-01', hasta: '2026-03-31' })).toEqual({
      preset: 'rango',
      desde: '2026-01-01',
      hasta: '2026-03-31',
      gran: undefined,
    });
    expect(normalizeSearch({ preset: 'rango', desde: '2026-04-01', hasta: '2026-01-01' })).toEqual(
      DEFAULT_SEARCH,
    );
    expect(normalizeSearch({ preset: 'rango', desde: 'mal', hasta: '2026-01-01' })).toEqual(
      DEFAULT_SEARCH,
    );
  });

  it('keeps a valid granularity override', () => {
    expect(normalizeSearch({ preset: 'este-mes', gran: 'SEMANAL' })).toEqual({
      preset: 'este-mes',
      gran: 'SEMANAL',
    });
    expect(normalizeSearch({ preset: 'este-mes', gran: 'XX' })).toEqual({
      preset: 'este-mes',
      gran: undefined,
    });
  });
});

describe('searchToApiParams', () => {
  it('maps simple presets to backend enum', () => {
    expect(searchToApiParams({ preset: 'ultimos-12-meses' })).toEqual({ preset: 'ULTIMOS_12_MESES' });
    expect(searchToApiParams({ preset: 'este-anio' })).toEqual({ preset: 'ESTE_ANIO' });
  });

  it('maps mes preset with anio/mes', () => {
    expect(searchToApiParams({ preset: 'mes', anio: 2026, mes: 6 })).toEqual({
      preset: 'MES_ESPECIFICO',
      anio: 2026,
      mes: 6,
    });
  });

  it('converts the inclusive end of a custom range to an exclusive hasta', () => {
    expect(searchToApiParams({ preset: 'rango', desde: '2026-01-01', hasta: '2026-03-31' })).toEqual(
      { desde: '2026-01-01', hasta: '2026-04-01' },
    );
  });

  it('passes the granularity override through', () => {
    expect(searchToApiParams({ preset: 'este-mes', gran: 'DIARIA' })).toEqual({
      preset: 'ESTE_MES',
      granularidad: 'DIARIA',
    });
  });
});

describe('exclusiveEnd', () => {
  it('adds one day, handling month and year rollover', () => {
    expect(exclusiveEnd('2026-03-31')).toBe('2026-04-01');
    expect(exclusiveEnd('2026-12-31')).toBe('2027-01-01');
    expect(exclusiveEnd('2024-02-29')).toBe('2024-03-01');
  });
});
