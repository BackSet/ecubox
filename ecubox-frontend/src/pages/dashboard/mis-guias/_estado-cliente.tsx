import type { EstadoGuiaMaster } from '@/types/guia-master';
import type { EstadoRastreoCliente } from '@/types/estado-rastreo';
import {
  StatusBadge,
  getRastreoStatusTone,
} from '@/components/ui/StatusBadge';
import type { EstadoLeyendaItem } from '@/components/estados/EstadosLeyendaDialog';
import {
  ESTADO_GUIA_MASTER_CATALOGO,
  GUIA_MASTER_ESTADO_ICONS,
  GUIA_MASTER_ESTADO_ORDEN,
  GUIA_MASTER_ESTADO_TONES,
  MI_GUIA_ESTADO_DESCRIPCIONES,
  MI_GUIA_ESTADO_LABELS,
  MI_GUIA_ESTADO_LABELS_CORTOS,
  describirEstadoCliente,
  type ConteosGuiaCliente,
} from '@/lib/estados/guiaMasterEstados';

/**
 * Vista del CLIENTE final para los estados de guía. Evita jerga interna
 * («Guía master», «Envío consolidado», «parcial/completo») y usa lenguaje
 * cercano a quien envía paquetes desde EE.UU.
 *
 * Todos los datos provienen del catálogo compartido
 * `@/lib/estados/guiaMasterEstados`; aquí solo se re-exportan los mapas de
 * cliente y se exponen helpers de presentación (badge y leyendas).
 */

export {
  MI_GUIA_ESTADO_LABELS,
  MI_GUIA_ESTADO_LABELS_CORTOS,
  MI_GUIA_ESTADO_DESCRIPCIONES,
  // Tono e icono son compartidos entre audiencias (presentación, no copy).
  GUIA_MASTER_ESTADO_TONES as MI_GUIA_ESTADO_TONES,
  GUIA_MASTER_ESTADO_ICONS as MI_GUIA_ESTADO_ICONS,
  GUIA_MASTER_ESTADO_ORDEN as MI_GUIA_ESTADO_ORDEN,
  describirEstadoCliente,
};
export type { ConteosGuiaCliente };

/**
 * Items para la leyenda "¿Qué significa cada estado?" de las guías del
 * cliente, en el orden natural del flujo.
 */
export function getMisGuiasLeyendaItems(): EstadoLeyendaItem[] {
  return GUIA_MASTER_ESTADO_ORDEN.map((estado) => {
    const def = ESTADO_GUIA_MASTER_CATALOGO[estado];
    return {
      key: estado,
      label: def.etiquetaCliente,
      descripcion: def.descripcionCliente,
      tone: def.tone,
      icon: def.icon,
    };
  });
}

/**
 * La leyenda configurable puede traer el placeholder {dias} (días
 * transcurridos en el estado). En el catálogo genérico no hay un paquete
 * concreto, así que se muestra como "X" (p. ej. "lleva X días en aduana").
 */
export function renderLeyendaGenerica(leyenda?: string | null): string | null {
  if (!leyenda) return null;
  return leyenda.replaceAll('{dias}', 'X');
}

/**
 * Items para la leyenda de estados de rastreo de los paquetes del cliente,
 * a partir del catálogo configurable (GET /api/mis-guias/estados-rastreo).
 */
export function getEstadosRastreoLeyendaItems(
  estados: EstadoRastreoCliente[] | undefined,
): EstadoLeyendaItem[] {
  return (estados ?? []).map((e) => ({
    key: String(e.id),
    label: e.nombre,
    descripcion: renderLeyendaGenerica(e.leyenda),
    tone: getRastreoStatusTone(e.tipoFlujo ?? null),
  }));
}

interface MiGuiaEstadoBadgeProps {
  estado: EstadoGuiaMaster;
  withTitle?: boolean;
  withIcon?: boolean;
  /**
   * Conteos opcionales de paquetes. Cuando se proveen, el título accesible
   * del badge expresa la parcialidad mediante cantidades.
   */
  conteos?: ConteosGuiaCliente;
}

export function MiGuiaEstadoBadge({
  estado,
  withTitle = true,
  withIcon = true,
  conteos,
}: MiGuiaEstadoBadgeProps) {
  const def = ESTADO_GUIA_MASTER_CATALOGO[estado];
  const Icon = def?.icon;
  return (
    <StatusBadge
      tone={def?.tone ?? 'neutral'}
      title={withTitle ? describirEstadoCliente(estado, conteos) : undefined}
      icon={withIcon && Icon ? <Icon className="h-3 w-3" /> : undefined}
    >
      {def?.etiquetaCliente ?? estado}
    </StatusBadge>
  );
}
