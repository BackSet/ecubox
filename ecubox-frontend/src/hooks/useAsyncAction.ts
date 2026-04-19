import { useCallback, useRef, useState } from 'react';
import { notify } from '@/lib/notify';

type RunMsgs<T> = {
  loading: string;
  success: string | ((value: T) => string);
  error?: string | ((err: unknown) => string);
};

interface UseAsyncActionResult {
  /**
   * Ejecuta `task()` envuelta en `notify.run`. Mientras dura la promesa,
   * `isPending` queda en `true` para que el botón se pueda deshabilitar y
   * mostrar un spinner. Si ya hay una ejecución en curso la nueva se
   * ignora silenciosamente para evitar dobles clicks.
   */
  run: <T>(task: () => Promise<T>, msgs: RunMsgs<T>) => Promise<T | undefined>;
  isPending: boolean;
}

/**
 * Hook ligero para acciones puntuales que no usan `useMutation` (por
 * ejemplo: exportar un PDF/Excel local, copiar al portapapeles con
 * pasos async, etc.). Une `notify.run` con un flag `isPending`
 * autocontenido y previene reentradas.
 */
export function useAsyncAction(): UseAsyncActionResult {
  const [isPending, setIsPending] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(
    async <T,>(task: () => Promise<T>, msgs: RunMsgs<T>): Promise<T | undefined> => {
      if (inFlight.current) return undefined;
      inFlight.current = true;
      setIsPending(true);
      try {
        return await notify.run(task(), msgs);
      } catch {
        return undefined;
      } finally {
        inFlight.current = false;
        setIsPending(false);
      }
    },
    [],
  );

  return { run, isPending };
}
