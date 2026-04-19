import axios, { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Throttle de toasts para errores de red/5xx: con TanStack Query + retry
 * automático varios componentes pueden disparar el mismo error en cadena.
 * Mostramos como máximo 1 toast cada TOAST_THROTTLE_MS para no saturar al
 * usuario cuando el backend está caído.
 */
const TOAST_THROTTLE_MS = 4000;
let lastNetworkToastAt = 0;
let lastServerToastAt = 0;

function showThrottledToast(kind: 'network' | 'server', message: string) {
  const now = Date.now();
  if (kind === 'network') {
    if (now - lastNetworkToastAt < TOAST_THROTTLE_MS) return;
    lastNetworkToastAt = now;
  } else {
    if (now - lastServerToastAt < TOAST_THROTTLE_MS) return;
    lastServerToastAt = now;
  }
  toast.error(message);
}

/**
 * Detecta si un error es transitorio: red caída, timeout o 5xx.
 * Útil para que la UI mantenga los datos previos en lugar de borrarlos.
 */
export function isTransientError(error: unknown): boolean {
  const err = error as AxiosError | undefined;
  if (!err) return false;
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return true;
  }
  const status = err.response?.status;
  return typeof status === 'number' && status >= 500 && status < 600;
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;

    if (status === 401) {
      useAuthStore.getState().logout();
      const path = window.location.pathname;
      if (path !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Network error / timeout: el backend no respondió.
    if (!error.response) {
      showThrottledToast(
        'network',
        'No se pudo conectar con el servidor. Verifica tu conexión o intenta más tarde.'
      );
      return Promise.reject(error);
    }

    // 5xx: el backend respondió con error interno.
    if (typeof status === 'number' && status >= 500) {
      showThrottledToast(
        'server',
        'El servidor tuvo un problema procesando la solicitud. Intenta de nuevo en unos segundos.'
      );
    }

    return Promise.reject(error);
  }
);
