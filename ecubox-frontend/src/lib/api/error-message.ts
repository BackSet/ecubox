type ApiErrorPayload = {
  message?: string;
};

/**
 * Forma estructural mínima de un error de API con respuesta. Cubre tanto el
 * {@link ApiError} de `openapi-client` (`{ response: { status, data } }`) como
 * cualquier error que exponga esa forma, sin acoplar a una librería HTTP.
 */
type ErrorWithResponse = {
  response?: {
    status?: number;
    data?: ApiErrorPayload;
  };
};

export function getApiErrorMessage(error: unknown): string | undefined {
  const apiError = error as ErrorWithResponse | undefined;
  const message = apiError?.response?.data?.message;
  if (typeof message === 'string' && message.trim().length > 0) {
    return message.trim();
  }
  const fallback = (error as { message?: string } | undefined)?.message;
  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback.trim();
  }
  return undefined;
}

export function getApiStatus(error: unknown): number | undefined {
  const apiError = error as ErrorWithResponse | undefined;
  return apiError?.response?.status;
}
