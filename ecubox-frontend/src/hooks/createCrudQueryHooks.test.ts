import { describe, expect, it } from 'vitest';
import { buildPageQueryKey } from './createCrudQueryHooks';

describe('buildPageQueryKey', () => {
  it('uses stable defaults for omitted pagination values', () => {
    expect(buildPageQueryKey(['agencias'], {})).toEqual([
      'agencias',
      'page',
      '',
      0,
      25,
    ]);
  });

  it('keeps the resource key and explicit pagination values', () => {
    expect(
      buildPageQueryKey(['admin', 'puntos'], { q: 'quito', page: 2, size: 50 }),
    ).toEqual(['admin', 'puntos', 'page', 'quito', 2, 50]);
  });
});
