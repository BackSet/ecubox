import { useCallback, useState } from 'react';

export interface UseSearchPaginationOptions {
  initialSize?: number;
  initialPage?: number;
  initialQuery?: string;
}

export interface UseSearchPaginationReturn {
  q: string;
  page: number;
  size: number;
  setQ: (value: string) => void;
  setPage: (value: number) => void;
  setSize: (value: number) => void;
  resetPage: () => void;
}

/**
 * Hook centralizado para listas paginadas con buscador.
 * - `setQ` resetea automáticamente la página a 0 (la búsqueda nunca debe
 *   quedarse "atorada" en una página vacía).
 * - `setSize` también resetea a 0 (la página actual ya no aplica con otro tamaño).
 * - Los componentes lo usan junto con `<TablePagination />` y `useQuery`
 *   con `placeholderData: keepPreviousData` para evitar parpadeos al paginar.
 */
export function useSearchPagination(opts: UseSearchPaginationOptions = {}): UseSearchPaginationReturn {
  const [q, setQRaw] = useState(opts.initialQuery ?? '');
  const [page, setPage] = useState(opts.initialPage ?? 0);
  const [size, setSizeRaw] = useState(opts.initialSize ?? 25);

  const setQ = useCallback((value: string) => {
    setQRaw(value);
    setPage(0);
  }, []);

  const setSize = useCallback((value: number) => {
    setSizeRaw(value);
    setPage(0);
  }, []);

  const resetPage = useCallback(() => setPage(0), []);

  return { q, page, size, setQ, setPage, setSize, resetPage };
}
