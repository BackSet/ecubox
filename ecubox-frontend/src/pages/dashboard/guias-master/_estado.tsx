import type { EstadoGuiaMaster } from '@/types/guia-master';

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

export const GUIA_MASTER_ESTADO_COLORS: Record<EstadoGuiaMaster, string> = {
  INCOMPLETA: 'bg-muted text-muted-foreground',
  PARCIAL_RECIBIDA: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  COMPLETA_RECIBIDA: 'bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100',
  PARCIAL_DESPACHADA: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100',
  CERRADA: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  CERRADA_CON_FALTANTE: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100',
};

export function GuiaMasterEstadoBadge({ estado }: { estado: EstadoGuiaMaster }) {
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
        GUIA_MASTER_ESTADO_COLORS[estado] ?? ''
      }`}
    >
      {GUIA_MASTER_ESTADO_LABELS[estado] ?? estado}
    </span>
  );
}
