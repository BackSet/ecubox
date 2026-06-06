import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { WebPushPublicKey, WebPushSubscriptionPayload } from '@/types/web-push';

const BASE = API_ENDPOINTS.push;

export async function obtenerWebPushPublicKey(): Promise<WebPushPublicKey> {
  const { data } = await apiClient.get<WebPushPublicKey>(`${BASE}/public-key`);
  return data;
}

export async function registrarWebPushSubscription(
  subscription: WebPushSubscriptionPayload
): Promise<void> {
  await apiClient.post(`${BASE}/subscriptions`, subscription);
}
