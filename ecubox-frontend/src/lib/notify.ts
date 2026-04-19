import { toast, type ExternalToast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api/error-message';

type ToastOpts = ExternalToast;

type RunMsgs<T> = {
  loading: string;
  success: string | ((value: T) => string);
  /**
   * Mensaje de error. Si se omite, intenta extraer el mensaje del backend
   * con `getApiErrorMessage` y, en su defecto, muestra "Ocurrió un error".
   */
  error?: string | ((err: unknown) => string);
};

function describeError(err: unknown, fallback?: string | ((e: unknown) => string)): string {
  if (typeof fallback === 'function') return fallback(err);
  if (typeof fallback === 'string') return fallback;
  const apiMsg = getApiErrorMessage(err);
  if (apiMsg) return apiMsg;
  return 'Ocurrió un error inesperado';
}

/**
 * Helper centralizado de notificaciones del proyecto. Encapsula `sonner`
 * para que el resto del código use una sola API y los mensajes sigan la
 * guía de tono unificada (loading en gerundio, success corto, error con
 * causa cuando se conoce).
 */
export const notify = {
  success: (msg: string, opts?: ToastOpts) => toast.success(msg, opts),
  error: (msg: string, opts?: ToastOpts) => toast.error(msg, { duration: 6000, ...opts }),
  warning: (msg: string, opts?: ToastOpts) => toast.warning(msg, { duration: 4000, ...opts }),
  info: (msg: string, opts?: ToastOpts) => toast.info(msg, { duration: 4000, ...opts }),
  message: (msg: string, opts?: ToastOpts) => toast(msg, opts),
  loading: (msg: string, opts?: ToastOpts) => toast.loading(msg, opts),
  dismiss: (id?: string | number) => toast.dismiss(id),

  /**
   * Muestra un toast de loading mientras se resuelve la promesa y lo
   * reemplaza por success/error al terminar. Devuelve la promesa original
   * (re-lanza el error) para que el caller pueda seguir manejándolo.
   */
  async run<T>(promise: Promise<T>, msgs: RunMsgs<T>, opts?: ToastOpts): Promise<T> {
    const id = toast.loading(msgs.loading, opts);
    try {
      const value = await promise;
      const successMsg = typeof msgs.success === 'function' ? msgs.success(value) : msgs.success;
      toast.success(successMsg, { id });
      return value;
    } catch (err) {
      const errorMsg = describeError(err, msgs.error);
      toast.error(errorMsg, { id, duration: 6000 });
      throw err;
    }
  },
};

export type Notify = typeof notify;
