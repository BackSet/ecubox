import type { ComponentType, SVGProps } from 'react';
import { Building2, Home, MapPin } from 'lucide-react';
import type { MiDespacho } from '@/types/mis-despacho';
import { modalidadLabel, modalidadLabelCorta } from '@/lib/entregas/modalidad';

/**
 * Presentación visual de las entregas del cliente (`/mis-entregas`): color e
 * icono por modalidad y armado del texto de búsqueda. Las etiquetas en lenguaje
 * cliente viven en `@/lib/entregas/modalidad` (sin dependencias de UI) y se
 * reexportan aquí para comodidad de las páginas. Tabla de escritorio, tarjetas
 * móviles y detalle consumen este módulo para no duplicar mapas de tipos.
 */
export {
  modalidadLabel,
  modalidadLabelCorta,
  modalidadLabelDetalle,
  type ModalidadEntrega,
} from '@/lib/entregas/modalidad';

type IconType = ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;

const MODALIDAD_BADGE: Record<string, string> = {
  DOMICILIO:
    'border-[color-mix(in_oklab,var(--color-success)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
  AGENCIA:
    'border-[color-mix(in_oklab,var(--color-info)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-info)_15%,transparent)] text-[color-mix(in_oklab,var(--color-info)_75%,var(--color-foreground))]',
  AGENCIA_COURIER_ENTREGA:
    'border-[color-mix(in_oklab,var(--color-primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)] text-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-foreground))]',
};

const MODALIDAD_ICON_BG: Record<string, string> = {
  DOMICILIO:
    'bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
  AGENCIA:
    'bg-[color-mix(in_oklab,var(--color-info)_15%,transparent)] text-[color-mix(in_oklab,var(--color-info)_75%,var(--color-foreground))]',
  AGENCIA_COURIER_ENTREGA:
    'bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)] text-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-foreground))]',
};

const MODALIDAD_ICON: Record<string, IconType> = {
  DOMICILIO: Home,
  AGENCIA: Building2,
  AGENCIA_COURIER_ENTREGA: MapPin,
};

export function modalidadBadgeClass(tipo?: string | null): string {
  return MODALIDAD_BADGE[tipo ?? ''] ?? '';
}

export function modalidadIconBgClass(tipo?: string | null): string {
  return MODALIDAD_ICON_BG[tipo ?? ''] ?? 'bg-[var(--color-muted)] text-muted-foreground';
}

export function modalidadIcon(tipo?: string | null): IconType {
  return MODALIDAD_ICON[tipo ?? ''] ?? MapPin;
}

/**
 * Construye el texto sobre el que busca el listado: número de guía de la
 * entrega, guías de los paquetes, destino, operador, modalidad e ID interno
 * (compatibilidad). Todo en minúsculas para comparación case-insensitive.
 */
export function buildEntregaHaystack(d: MiDespacho): string {
  const piezasGuias = d.piezas?.map((p) => p.numeroGuia ?? '').join(' ') ?? '';
  return [
    d.numeroGuia ?? '',
    piezasGuias,
    d.destinoNombre ?? '',
    d.operadorEntregaNombre ?? '',
    modalidadLabel(d.tipoEntrega),
    modalidadLabelCorta(d.tipoEntrega),
    String(d.despachoId),
  ]
    .join(' ')
    .toLowerCase();
}
