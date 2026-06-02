import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  contarNotificacionesNoLeidas,
  listarNotificaciones,
  marcarNotificacionLeida,
  marcarTodasNotificacionesLeidas,
} from '@/lib/api/notificaciones.service';
import { hasActivePushSubscription, notifyUser } from '@/lib/pwa';
import { useAuthStore } from '@/stores/authStore';
import type { NotificacionUsuario } from '@/types/notificacion';

export const NOTIFICACIONES_QUERY_KEY = ['notificaciones'] as const;

const NOTIFIED_KEY = 'ecubox_notificaciones_notified';

function loadNotifiedIds(): Set<number> {
  if (typeof localStorage === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    const parsed = raw ? (JSON.parse(raw) as number[]) : [];
    return new Set(parsed.filter(Number.isFinite));
  } catch {
    return new Set();
  }
}

function storeNotifiedIds(ids: Set<number>) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...ids].slice(-100)));
}

function notifyUnreadChanges(notificaciones: NotificacionUsuario[]) {
  const notifiedIds = loadNotifiedIds();
  let changed = false;

  for (const notification of notificaciones.slice().reverse()) {
    if (notification.leida || notifiedIds.has(notification.id)) continue;
    notifiedIds.add(notification.id);
    changed = true;
    notifyUser(notification.titulo, {
      body: notification.mensaje,
      tag: `ecubox-${notification.id}`,
      data: notification.url ? { url: notification.url } : undefined,
    });
  }

  if (changed) {
    storeNotifiedIds(notifiedIds);
  }
}

export function useNotificaciones(limit = 20) {
  const token = useAuthStore((state) => state.token);
  const enabled = Boolean(token);

  const query = useQuery({
    queryKey: [...NOTIFICACIONES_QUERY_KEY, 'list', limit],
    queryFn: () => listarNotificaciones(limit),
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  // Si hay suscripcion Web Push, el servidor entrega los avisos y no debemos
  // duplicarlos con notificaciones locales durante el polling.
  const pushActiveRef = useRef(false);
  useEffect(() => {
    let mounted = true;
    void hasActivePushSubscription().then((active) => {
      if (mounted) pushActiveRef.current = active;
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (query.data && !pushActiveRef.current) {
      notifyUnreadChanges(query.data);
    }
  }, [query.data]);

  return query;
}

export function useNotificacionesNoLeidas() {
  const token = useAuthStore((state) => state.token);
  return useQuery({
    queryKey: [...NOTIFICACIONES_QUERY_KEY, 'unread-count'],
    queryFn: contarNotificacionesNoLeidas,
    enabled: Boolean(token),
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

export function useMarcarNotificacionLeida() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marcarNotificacionLeida,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICACIONES_QUERY_KEY });
    },
  });
}

export function useMarcarTodasNotificacionesLeidas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: marcarTodasNotificacionesLeidas,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: NOTIFICACIONES_QUERY_KEY });
    },
  });
}
