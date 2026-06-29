import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { components } from '@/lib/api/generated/schema';
import type { WebPushPublicKey, WebPushSubscriptionPayload } from '@/types/web-push';

const BASE = '/api/push' as const;

export async function obtenerWebPushPublicKey(): Promise<WebPushPublicKey> {
  const data = await unwrap(openapiClient.GET(`${BASE}/public-key`));
  return data as WebPushPublicKey;
}

export async function registrarWebPushSubscription(
  subscription: WebPushSubscriptionPayload,
): Promise<void> {
  await ensureOk(
    openapiClient.POST(`${BASE}/subscriptions`, {
      body: subscription as components['schemas']['WebPushSubscriptionRequest'],
    }),
  );
}
