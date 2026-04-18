import type { EstadoGuiaMaster } from '@/types/guia-master';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';

export const GUIA_MASTER_ESTADO_LABELS: Record<EstadoGuiaMaster, string> = {
  INCOMPLETA: 'Incompleta',
  PARCIAL_RECIBIDA: 'Parcial recibida',
  COMPLETA_RECIBIDA: 'Completa recibida',
  PARCIAL_DESPACHADA: 'Parcial despachada',
  CERRADA: 'Cerrada',
  CERRADA_CON_FALTANTE: 'Cerrada con faltante',
};

export const GUIA_MASTER_ESTADO_LABELS_PLURAL: Record<EstadoGuiaMaster, string> = {
  INCOMPLETA: 'Incompletas',
  PARCIAL_RECIBIDA: 'Parcial recibidas',
  COMPLETA_RECIBIDA: 'Completas recibidas',
  PARCIAL_DESPACHADA: 'Parcial despachadas',
  CERRADA: 'Cerradas',
  CERRADA_CON_FALTANTE: 'Cerradas con faltante',
};

export const GUIA_MASTER_ESTADO_TONES: Record<EstadoGuiaMaster, StatusTone> = {
  INCOMPLETA: 'neutral',
  PARCIAL_RECIBIDA: 'warning',
  COMPLETA_RECIBIDA: 'info',
  PARCIAL_DESPACHADA: 'primary',
  CERRADA: 'success',
  CERRADA_CON_FALTANTE: 'error',
};

export function GuiaMasterEstadoBadge({ estado }: { estado: EstadoGuiaMaster }) {
  return (
    <StatusBadge tone={GUIA_MASTER_ESTADO_TONES[estado] ?? 'neutral'}>
      {GUIA_MASTER_ESTADO_LABELS[estado] ?? estado}
    </StatusBadge>
  );
}
