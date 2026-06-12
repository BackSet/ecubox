import { toast, type ExternalToast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api/error-message';

type ToastOpts = ExternalToast;

/**
 * Segundo argumento de los métodos de `notify`: un string se interpreta
 * como `description` (el caso más común: título corto + detalle), o un
 * objeto de opciones de sonner para control fino (duration, id, etc.).
 */
type OptsOrDescription = ToastOpts | string;

/** Mensaje de resultado: título solo, o título + descripción. */
type ToastMsg = string | { title: string; description?: string };

type RunMsgs<T> = {
  loading: string;
  success: ToastMsg | ((value: T) => ToastMsg);
  /**
   * Mensaje de error. Si se omite, intenta extraer el mensaje del backend
   * con `getApiErrorMessage` y, en su defecto, muestra "Ocurrió un error".
   */
  error?: ToastMsg | ((err: unknown) => ToastMsg);
};

function normalizeOpts(opts?: OptsOrDescription): ToastOpts | undefined {
  if (typeof opts === 'string') return { description: opts };
  return opts;
}

function splitMsg(msg: ToastMsg): { title: string; description?: string } {
  return typeof msg === 'string' ? { title: msg } : msg;
}

function describeError(err: unknown, fallback?: ToastMsg | ((e: unknown) => ToastMsg)): ToastMsg {
  if (typeof fallback === 'function') return fallback(err);
  if (fallback != null) return fallback;
  const apiMsg = getApiErrorMessage(err);
  if (apiMsg) return apiMsg;
  return 'Ocurrió un error inesperado';
}

/**
 * Helper centralizado de notificaciones del proyecto. Encapsula `sonner`
 * para que el resto del código use una sola API y los mensajes sigan la
 * guía de tono unificada (título corto con el resultado; descripción con
 * objeto afectado, estado aplicado, cantidad, causa o siguiente paso).
 *
 * El segundo argumento acepta directamente la descripción como string:
 * `notify.success('Paquete registrado', 'Pieza 2/3 de la guía X.')`.
 */
export const notify = {
  success: (msg: string, opts?: OptsOrDescription) => toast.success(msg, normalizeOpts(opts)),
  error: (msg: string, opts?: OptsOrDescription) =>
    toast.error(msg, { duration: 6000, ...normalizeOpts(opts) }),
  warning: (msg: string, opts?: OptsOrDescription) =>
    toast.warning(msg, { duration: 4000, ...normalizeOpts(opts) }),
  info: (msg: string, opts?: OptsOrDescription) =>
    toast.info(msg, { duration: 4000, ...normalizeOpts(opts) }),
  message: (msg: string, opts?: OptsOrDescription) => toast(msg, normalizeOpts(opts)),
  loading: (msg: string, opts?: OptsOrDescription) => toast.loading(msg, normalizeOpts(opts)),
  dismiss: (id?: string | number) => toast.dismiss(id),

  /**
   * Muestra un toast de loading mientras se resuelve la promesa y lo
   * reemplaza por success/error al terminar. `success` y `error` pueden
   * devolver `{ title, description }` para mensajes con detalle. Devuelve
   * la promesa original (re-lanza el error) para que el caller pueda
   * seguir manejándolo.
   */
  async run<T>(promise: Promise<T>, msgs: RunMsgs<T>, opts?: ToastOpts): Promise<T> {
    const id = toast.loading(msgs.loading, opts);
    try {
      const value = await promise;
      const successMsg = splitMsg(
        typeof msgs.success === 'function' ? msgs.success(value) : msgs.success,
      );
      toast.success(successMsg.title, { id, description: successMsg.description });
      return value;
    } catch (err) {
      const errorMsg = splitMsg(describeError(err, msgs.error));
      toast.error(errorMsg.title, { id, duration: 6000, description: errorMsg.description });
      throw err;
    }
  },
};

export type Notify = typeof notify;
