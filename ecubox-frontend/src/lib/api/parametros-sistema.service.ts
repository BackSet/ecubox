import { API_ENDPOINTS } from '@/lib/api/endpoints';
import { apiClient } from '@/lib/api/client';

export interface MensajeWhatsAppDespacho {
  plantilla: string;
}

const BASE = API_ENDPOINTS.operarioMensajeWhatsAppDespacho;

export async function getMensajeWhatsAppDespacho(): Promise<MensajeWhatsAppDespacho> {
  const { data } = await apiClient.get<{ plantilla?: string }>(BASE);
  return {
    plantilla: data.plantilla ?? '',
  };
}

export async function updateMensajeWhatsAppDespacho(body: {
  plantilla: string;
}): Promise<MensajeWhatsAppDespacho> {
  const { data } = await apiClient.put<{ plantilla?: string }>(BASE, body);
  return {
    plantilla: data.plantilla ?? '',
  };
}
