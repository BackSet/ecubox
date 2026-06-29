import { afterEach, describe, expect, it, vi } from 'vitest';

const useBlockerMock = vi.hoisted(() => vi.fn((_opts: unknown) => ({ status: 'idle' })));
vi.mock('@tanstack/react-router', () => ({ useBlocker: useBlockerMock }));

import { useUnsavedChangesBlocker } from './useUnsavedChangesBlocker';

afterEach(() => useBlockerMock.mockClear());

describe('useUnsavedChangesBlocker', () => {
  it('shouldBlockFn y enableBeforeUnload reflejan isDirty=true', () => {
    useUnsavedChangesBlocker(true);
    const opts = useBlockerMock.mock.calls[0]![0] as {
      shouldBlockFn: () => boolean;
      enableBeforeUnload: () => boolean;
      withResolver: boolean;
    };
    expect(opts.shouldBlockFn()).toBe(true);
    // CLAVE: el aviso nativo solo se habilita cuando hay cambios.
    expect(opts.enableBeforeUnload()).toBe(true);
    expect(opts.withResolver).toBe(true);
  });

  it('no bloquea ni habilita beforeunload cuando isDirty=false', () => {
    useUnsavedChangesBlocker(false);
    const opts = useBlockerMock.mock.calls[0]![0] as {
      shouldBlockFn: () => boolean;
      enableBeforeUnload: () => boolean;
    };
    expect(opts.shouldBlockFn()).toBe(false);
    expect(opts.enableBeforeUnload()).toBe(false);
  });
});
