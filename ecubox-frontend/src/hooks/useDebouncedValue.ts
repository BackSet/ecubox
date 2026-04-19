import { useEffect, useState } from 'react';

/**
 * Devuelve una versión "debounced" de `value`: solo se actualiza cuando han
 * pasado al menos `delayMs` milisegundos sin que `value` cambie.
 *
 * Pensado para filtros de tabla y campos de búsqueda donde no queremos
 * disparar trabajo (re-render pesado, fetch, recomputo de memos) en cada
 * tecla.
 *
 * @example
 * const [text, setText] = useState('');
 * const debouncedText = useDebouncedValue(text, 300);
 *
 * useEffect(() => {
 *   // Esto solo corre 300ms después de la última tecla.
 *   buscar(debouncedText);
 * }, [debouncedText]);
 */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (delayMs <= 0) {
      setDebounced(value);
      return;
    }
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
