import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  obtenerWebPushPublicKey,
  registrarWebPushSubscription,
} from '@/lib/api/web-push.service';
import {
  canUseNotifications,
  detectInstallPlatform,
  isStandalonePwa,
  requestNotificationPermission,
  serializePushSubscription,
  subscribeToWebPush,
} from '@/lib/pwa';
import { useAuthStore } from '@/stores/authStore';

export type NotificationStatus =
  | NotificationPermission
  | 'requires-install'
  | 'unsupported';

function currentStatus(): NotificationStatus {
  if (detectInstallPlatform() === 'ios' && !isStandalonePwa()) {
    return 'requires-install';
  }
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

/**
 * Hook unificado para activar notificaciones desde cualquier punto de la UI.
 *
 * - Solicita el permiso del navegador.
 * - Si hay sesion y el servidor tiene Web Push habilitado, registra la
 *   suscripcion VAPID para recibir avisos con la app cerrada.
 *
 * Centraliza la logica que antes estaba duplicada entre la campana, el panel
 * PWA de la home y la pagina de casillero.
 */
export function useActivarNotificaciones() {
  const token = useAuthStore((state) => state.token);
  const [permission, setPermission] = useState<NotificationStatus>(currentStatus);

  useEffect(() => {
    setPermission(currentStatus());
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      if (permission === 'requires-install') {
        throw new Error('En iPhone o iPad, instala ECUBOX antes de activar los avisos.');
      }
      if (!canUseNotifications()) {
        throw new Error('Este navegador no admite notificaciones web.');
      }

      const permiso = await requestNotificationPermission();
      setPermission(permiso);
      if (permiso !== 'granted') {
        throw new Error('No se concedio el permiso de notificaciones.');
      }

      // La suscripcion Web Push requiere sesion (el endpoint esta protegido) y
      // que el servidor tenga claves VAPID configuradas. Sin esto, el permiso
      // del navegador ya habilita avisos locales mientras la pestaña vive.
      if (!token) return;

      const config = await obtenerWebPushPublicKey();
      if (!config.enabled || !config.publicKey) return;

      const subscription = await subscribeToWebPush(config.publicKey);
      if (!subscription) return;

      await registrarWebPushSubscription(serializePushSubscription(subscription));
    },
    onSuccess: () => {
      toast.success('Notificaciones activadas.');
    },
    onError: (error) => {
      toast.error(
        error instanceof Error ? error.message : 'No se pudieron activar las notificaciones.'
      );
    },
  });

  return {
    permission,
    isSupported: permission !== 'unsupported' && permission !== 'requires-install',
    requiresInstall: permission === 'requires-install',
    isGranted: permission === 'granted',
    activate: mutation.mutate,
    isPending: mutation.isPending,
  };
}
