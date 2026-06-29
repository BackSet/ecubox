import { openapiClient, unwrap, ensureOk } from '@/lib/api/openapi-client';
import type { NotificacionUsuario, NotificacionesUnreadCount } from '@/types/notificacion';

const BASE = '/api/notificaciones' as const;

export async function listarNotificaciones(limit = 20): Promise<NotificacionUsuario[]> {
  const data = await unwrap(openapiClient.GET(BASE, { params: { query: { limit } } }));
  return data as NotificacionUsuario[];
}

export async function contarNotificacionesNoLeidas(): Promise<NotificacionesUnreadCount> {
  const data = await unwrap(openapiClient.GET(`${BASE}/unread-count`));
  return data as NotificacionesUnreadCount;
}

export async function marcarNotificacionLeida(id: number): Promise<NotificacionUsuario> {
  const data = await unwrap(
    openapiClient.PATCH(`${BASE}/{id}/read`, { params: { path: { id } } }),
  );
  return data as NotificacionUsuario;
}

export async function marcarTodasNotificacionesLeidas(): Promise<void> {
  await ensureOk(openapiClient.PATCH(`${BASE}/read-all`));
}
