import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMensajeWhatsAppDespacho,
  updateMensajeWhatsAppDespacho,
} from '@/lib/api/parametros-sistema.service';

export const MENSAJE_WHATSAPP_DESPACHO_QUERY_KEY = [
  'operario',
  'config',
  'mensaje-whatsapp-despacho',
] as const;

export function useMensajeWhatsAppDespacho() {
  return useQuery({
    queryKey: MENSAJE_WHATSAPP_DESPACHO_QUERY_KEY,
    queryFn: getMensajeWhatsAppDespacho,
  });
}

export function useUpdateMensajeWhatsAppDespacho() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { plantilla: string }) => updateMensajeWhatsAppDespacho(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MENSAJE_WHATSAPP_DESPACHO_QUERY_KEY });
    },
  });
}
