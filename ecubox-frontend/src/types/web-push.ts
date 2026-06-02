export interface WebPushPublicKey {
  enabled: boolean;
  publicKey: string;
}

export interface WebPushSubscriptionPayload {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}
