import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  obtenerWebPushPublicKey,
  registrarWebPushSubscription,
} from '@/lib/api/web-push.service';
import { serializePushSubscription, subscribeToWebPush } from '@/lib/pwa';
import { useAuthStore } from '@/stores/authStore';

export function useActivarWebPush() {
  const token = useAuthStore((state) => state.token);

  return useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('Inicia sesion para activar notificaciones push.');
      }

      const config = await obtenerWebPushPublicKey();
      if (!config.enabled || !config.publicKey) {
        throw new Error('Web Push aun no esta configurado en el servidor.');
      }

      const subscription = await subscribeToWebPush(config.publicKey);
      if (!subscription) {
        throw new Error('El navegador no concedio permisos de notificacion.');
      }

      await registrarWebPushSubscription(serializePushSubscription(subscription));
    },
    onSuccess: () => {
      toast.success('Notificaciones push activadas.');
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'No se pudo activar Web Push.');
    },
  });
}
