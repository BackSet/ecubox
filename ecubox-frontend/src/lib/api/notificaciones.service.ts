import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/endpoints';
import type { NotificacionUsuario, NotificacionesUnreadCount } from '@/types/notificacion';

const BASE = API_ENDPOINTS.notificaciones;

export async function listarNotificaciones(limit = 20): Promise<NotificacionUsuario[]> {
  const { data } = await apiClient.get<NotificacionUsuario[]>(BASE, { params: { limit } });
  return data;
}

export async function contarNotificacionesNoLeidas(): Promise<NotificacionesUnreadCount> {
  const { data } = await apiClient.get<NotificacionesUnreadCount>(`${BASE}/unread-count`);
  return data;
}

export async function marcarNotificacionLeida(id: number): Promise<NotificacionUsuario> {
  const { data } = await apiClient.patch<NotificacionUsuario>(`${BASE}/${id}/read`);
  return data;
}

export async function marcarTodasNotificacionesLeidas(): Promise<void> {
  await apiClient.patch(`${BASE}/read-all`);
}
