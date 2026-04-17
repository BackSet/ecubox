import type { AxiosError } from 'axios';

type ApiErrorPayload = {
  message?: string;
};

type ApiErrorResponse = {
  data?: ApiErrorPayload;
};

export function getApiErrorMessage(error: unknown): string | undefined {
  const axiosError = error as AxiosError<ApiErrorPayload> | undefined;
  const message = axiosError?.response?.data?.message;
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
  const axiosError = error as AxiosError<ApiErrorPayload> | undefined;
  return axiosError?.response?.status;
}

export function getApiResponse(error: unknown): ApiErrorResponse | undefined {
  const axiosError = error as AxiosError<ApiErrorPayload> | undefined;
  return axiosError?.response;
}
