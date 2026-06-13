import type { EstadoGuiaMaster } from '@/types/guia-master';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  ESTADO_GUIA_MASTER_CATALOGO,
  GUIA_MASTER_ESTADO_DESCRIPCIONES,
  GUIA_MASTER_ESTADO_ICONS,
  GUIA_MASTER_ESTADO_LABELS,
  GUIA_MASTER_ESTADO_LABELS_CORTOS,
  GUIA_MASTER_ESTADO_LABELS_PLURAL,
  GUIA_MASTER_ESTADO_ORDEN,
  GUIA_MASTER_ESTADO_TONES,
  GUIA_MASTER_ESTADOS_CONGELADOS,
  GUIA_MASTER_ESTADOS_TERMINALES,
} from '@/lib/estados/guiaMasterEstados';

/**
 * Vista del OPERARIO / administración para los estados de guía master.
 *
 * Las etiquetas, descripciones, tonos, iconos y conjuntos provienen del
 * catálogo compartido `@/lib/estados/guiaMasterEstados`. Aquí solo se
 * re-exportan los mapas internos y se expone el badge de back-office, sin
 * duplicar datos con la vista cliente (`mis-guias/_estado-cliente`).
 */

export {
  GUIA_MASTER_ESTADO_LABELS,
  GUIA_MASTER_ESTADO_LABELS_CORTOS,
  GUIA_MASTER_ESTADO_LABELS_PLURAL,
  GUIA_MASTER_ESTADO_DESCRIPCIONES,
  GUIA_MASTER_ESTADO_TONES,
  GUIA_MASTER_ESTADO_ICONS,
  GUIA_MASTER_ESTADO_ORDEN,
  GUIA_MASTER_ESTADOS_TERMINALES,
  GUIA_MASTER_ESTADOS_CONGELADOS,
};

export interface GuiaMasterEstadoBadgeProps {
  estado: EstadoGuiaMaster;
  withIcon?: boolean;
  withTitle?: boolean;
}

export function GuiaMasterEstadoBadge({
  estado,
  withIcon = true,
  withTitle = true,
}: GuiaMasterEstadoBadgeProps) {
  const def = ESTADO_GUIA_MASTER_CATALOGO[estado];
  const Icon = def?.icon;
  return (
    <StatusBadge
      tone={def?.tone ?? 'neutral'}
      title={withTitle ? def?.descripcionInterna : undefined}
      icon={withIcon && Icon ? <Icon className="h-3 w-3" /> : undefined}
    >
      {def?.etiquetaInterna ?? estado}
    </StatusBadge>
  );
}
