import {
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  Package,
  PackageCheck,
  PackageOpen,
  Send,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from 'lucide-react';
import type { EstadoGuiaMaster } from '@/types/guia-master';
import type { StatusTone } from '@/components/ui/StatusBadge';

/**
 * Catálogo canónico y exhaustivo de estados de `EstadoGuiaMaster`.
 *
 * Es la ÚNICA fuente de verdad que separa el lenguaje INTERNO (administración,
 * back-office, documentación técnica) del lenguaje VISIBLE para el CLIENTE.
 *
 * - Lenguaje interno: conserva la jerga operativa («Guía master», «Envío
 *   consolidado», «parcial/completo», «estado derivado»…). Se usa en paneles
 *   administrativos y nunca debe simplificarse ahí.
 * - Lenguaje cliente: términos simples y sin jerga. Estados parciales y
 *   completos COMPARTEN la misma etiqueta pública; la parcialidad se expresa
 *   mediante cantidades (ver {@link describirEstadoCliente}).
 *
 * El tipo `Record<EstadoGuiaMaster, …>` fuerza un error de compilación si se
 * agrega un nuevo estado al enum sin proveer aquí su traducción completa.
 *
 * Sincronizado con el enum del backend tras la migración V107. No se crea
 * migración ni configuración editable: el catálogo vive en código.
 */
export interface EstadoGuiaMasterDef {
  /** Etiqueta interna (administración / back-office). */
  etiquetaInterna: string;
  /** Etiqueta interna corta (chips, tablas densas). */
  etiquetaInternaCorta: string;
  /** Descripción interna (conserva jerga operativa). */
  descripcionInterna: string;
  /** Etiqueta visible para el cliente. Parcial y completo comparten valor. */
  etiquetaCliente: string;
  /** Etiqueta cliente corta (chips, tarjetas móviles). */
  etiquetaClienteCorta: string;
  /**
   * Descripción cliente de respaldo (sin conteos). Para los estados parciales
   * es la variante «Algunos paquetes…»; el conteo dinámico se arma en
   * {@link describirEstadoCliente} cuando hay cantidades disponibles.
   */
  descripcionCliente: string;
  /** Tono semántico compartido (badges, chips). */
  tone: StatusTone;
  /** Icono compartido. */
  icon: LucideIcon;
}

export const ESTADO_GUIA_MASTER_CATALOGO: Record<EstadoGuiaMaster, EstadoGuiaMasterDef> = {
  PENDIENTE_VERIFICACION: {
    etiquetaInterna: 'Pendiente de verificación',
    etiquetaInternaCorta: 'Pend. verificación',
    descripcionInterna:
      'Guía creada por el cliente. Pendiente de revisión y aprobación por el operario.',
    etiquetaCliente: 'Pendiente de verificación',
    etiquetaClienteCorta: 'Pend. verificación',
    descripcionCliente:
      'Registraste la guía y nuestro equipo debe verificarla antes de continuar.',
    tone: 'warning',
    icon: Clock,
  },
  VERIFICADA: {
    etiquetaInterna: 'Verificada',
    etiquetaInternaCorta: 'Verificada',
    descripcionInterna:
      'Aprobada por el operario. El sistema calcula automáticamente el estado derivado.',
    etiquetaCliente: 'Guía verificada',
    etiquetaClienteCorta: 'Verificada',
    descripcionCliente:
      'La guía fue revisada y está lista para continuar el proceso.',
    tone: 'info',
    icon: ShieldCheck,
  },
  EN_REVISION: {
    etiquetaInterna: 'En revisión',
    etiquetaInternaCorta: 'En revisión',
    descripcionInterna:
      'Pausada por el operario para validar algún dato. El recálculo automático no la sobreescribe.',
    etiquetaCliente: 'En revisión',
    etiquetaClienteCorta: 'En revisión',
    descripcionCliente:
      'Encontramos información que debe revisarse antes de continuar.',
    tone: 'warning',
    icon: Eye,
  },
  SIN_PAQUETES_REGISTRADOS: {
    etiquetaInterna: 'Sin paquetes registrados',
    etiquetaInternaCorta: 'Sin paquetes',
    descripcionInterna:
      'La guía existe en el sistema pero aún no tiene paquetes asociados.',
    etiquetaCliente: 'Sin paquetes registrados',
    etiquetaClienteCorta: 'Sin paquetes',
    descripcionCliente:
      'La guía está registrada, pero todavía no se han identificado paquetes asociados.',
    tone: 'neutral',
    icon: Package,
  },
  CON_PAQUETES_REGISTRADOS: {
    etiquetaInterna: 'Con paquetes registrados',
    etiquetaInternaCorta: 'Con paquetes',
    descripcionInterna:
      'Hay paquetes registrados pero ninguno fue asignado a un envío consolidado todavía.',
    etiquetaCliente: 'En preparación',
    etiquetaClienteCorta: 'En preparación',
    descripcionCliente:
      'Los paquetes de tu guía ya fueron registrados y están siendo preparados para el envío.',
    tone: 'neutral',
    icon: Package,
  },
  ENVIO_PARCIAL: {
    etiquetaInterna: 'Envío parcial',
    etiquetaInternaCorta: 'Envío parcial',
    descripcionInterna:
      'Al menos un paquete está en un envío consolidado pero no todos (o no alcanza el total esperado).',
    etiquetaCliente: 'En camino a Ecuador',
    etiquetaClienteCorta: 'En camino a Ecuador',
    descripcionCliente:
      'Algunos paquetes de tu guía ya fueron incluidos en el envío hacia Ecuador.',
    tone: 'primary',
    icon: Send,
  },
  ENVIO_COMPLETO: {
    etiquetaInterna: 'Envío completo',
    etiquetaInternaCorta: 'Envío completo',
    descripcionInterna:
      'Todos los paquetes esperados están en un envío consolidado. Lista para salir de USA.',
    etiquetaCliente: 'En camino a Ecuador',
    etiquetaClienteCorta: 'En camino a Ecuador',
    descripcionCliente:
      'Todos los paquetes registrados de tu guía fueron incluidos en el envío hacia Ecuador.',
    tone: 'primary',
    icon: Send,
  },
  RECEPCION_PARCIAL: {
    etiquetaInterna: 'Recepción parcial',
    etiquetaInternaCorta: 'Rec. parcial',
    descripcionInterna:
      'Se recibió al menos un paquete en bodega; faltan otros por llegar o registrarse.',
    etiquetaCliente: 'En bodega',
    etiquetaClienteCorta: 'En bodega',
    descripcionCliente:
      'Algunos paquetes de tu guía ya llegaron a nuestra bodega en Ecuador.',
    tone: 'warning',
    icon: PackageOpen,
  },
  RECEPCION_COMPLETA: {
    etiquetaInterna: 'Recepción completa',
    etiquetaInternaCorta: 'Rec. completa',
    descripcionInterna:
      'Todos los paquetes esperados están en bodega. Lista para iniciar despacho.',
    etiquetaCliente: 'En bodega',
    etiquetaClienteCorta: 'En bodega',
    descripcionCliente:
      'Todos los paquetes enviados de tu guía ya llegaron a nuestra bodega en Ecuador.',
    tone: 'info',
    icon: PackageCheck,
  },
  DESPACHO_PARCIAL: {
    etiquetaInterna: 'Despacho parcial',
    etiquetaInternaCorta: 'Desp. parcial',
    descripcionInterna:
      'Al menos un paquete fue despachado hacia el destino; quedan paquetes pendientes.',
    etiquetaCliente: 'En camino al destino',
    etiquetaClienteCorta: 'En camino al destino',
    descripcionCliente:
      'Algunos paquetes de tu guía ya salieron hacia el lugar de entrega o retiro.',
    tone: 'primary',
    icon: Truck,
  },
  DESPACHO_COMPLETADO: {
    etiquetaInterna: 'Despacho completado',
    etiquetaInternaCorta: 'Despachada',
    descripcionInterna: 'Todos los paquetes fueron despachados. Cierre exitoso.',
    etiquetaCliente: 'Entregada',
    etiquetaClienteCorta: 'Entregada',
    descripcionCliente:
      'Todos los paquetes de tu guía fueron despachados o entregados.',
    tone: 'success',
    icon: CheckCircle2,
  },
  CANCELADA: {
    etiquetaInterna: 'Cancelada',
    etiquetaInternaCorta: 'Cancelada',
    descripcionInterna:
      'Anulada por el operario (error de registro, cancelación del cliente o faltante definitivo).',
    etiquetaCliente: 'Cancelada',
    etiquetaClienteCorta: 'Cancelada',
    descripcionCliente:
      'La guía fue cancelada y no continuará el proceso.',
    tone: 'neutral',
    icon: Ban,
  },
};

/** Etiquetas internas en plural (listados/filtros de administración). */
export const GUIA_MASTER_ESTADO_LABELS_PLURAL: Record<EstadoGuiaMaster, string> = {
  SIN_PAQUETES_REGISTRADOS: 'Sin paquetes registrados',
  CON_PAQUETES_REGISTRADOS: 'Con paquetes registrados',
  PENDIENTE_VERIFICACION: 'Pendientes de verificación',
  VERIFICADA: 'Verificadas',
  ENVIO_PARCIAL: 'Envío parcial',
  ENVIO_COMPLETO: 'Envío completo',
  RECEPCION_PARCIAL: 'Recepción parcial',
  RECEPCION_COMPLETA: 'Recepción completa',
  DESPACHO_PARCIAL: 'Despacho parcial',
  DESPACHO_COMPLETADO: 'Despacho completado',
  CANCELADA: 'Canceladas',
  EN_REVISION: 'En revisión',
};

/**
 * Orden natural del flujo, usado tanto en administración como en la vista
 * cliente para presentar leyendas, chips y filtros.
 */
export const GUIA_MASTER_ESTADO_ORDEN: EstadoGuiaMaster[] = [
  'PENDIENTE_VERIFICACION',
  'VERIFICADA',
  'EN_REVISION',
  'SIN_PAQUETES_REGISTRADOS',
  'CON_PAQUETES_REGISTRADOS',
  'ENVIO_PARCIAL',
  'ENVIO_COMPLETO',
  'RECEPCION_PARCIAL',
  'RECEPCION_COMPLETA',
  'DESPACHO_PARCIAL',
  'DESPACHO_COMPLETADO',
  'CANCELADA',
];

/** Estados terminales (la guía ya no avanzará más en el flujo automático). */
export const GUIA_MASTER_ESTADOS_TERMINALES: ReadonlySet<EstadoGuiaMaster> =
  new Set<EstadoGuiaMaster>(['DESPACHO_COMPLETADO', 'CANCELADA']);

/** Estados que congelan el recálculo automático. */
export const GUIA_MASTER_ESTADOS_CONGELADOS: ReadonlySet<EstadoGuiaMaster> =
  new Set<EstadoGuiaMaster>([
    'PENDIENTE_VERIFICACION',
    'EN_REVISION',
    'DESPACHO_COMPLETADO',
    'CANCELADA',
  ]);

/**
 * Estados cliente que agrupan una variante PARCIAL y otra COMPLETA bajo una
 * misma etiqueta pública. Útil para anotar la agrupación en el panel
 * administrativo de equivalencias.
 */
export const GUIA_MASTER_ESTADOS_AGRUPADOS_CLIENTE: ReadonlyArray<
  readonly [EstadoGuiaMaster, EstadoGuiaMaster]
> = [
  ['ENVIO_PARCIAL', 'ENVIO_COMPLETO'],
  ['RECEPCION_PARCIAL', 'RECEPCION_COMPLETA'],
];

/**
 * Conteos de paquetes disponibles en los DTOs de guía del cliente
 * (`GuiaMaster`/`MiGuia*`). Se usan para expresar la parcialidad mediante
 * cantidades en vez de la palabra «parcial».
 *
 * Nota: no existe un conteo de «enviados» (paquetes incluidos en el envío
 * consolidado), por lo que «En camino a Ecuador» usa siempre el texto de
 * respaldo sin números.
 */
export interface ConteosGuiaCliente {
  totalEsperado?: number | null;
  registrados?: number | null;
  recibidos?: number | null;
  despachados?: number | null;
}

function fraseConteo(
  parcial: number | null | undefined,
  total: number | null | undefined,
  plantilla: (x: number, n: number) => string,
): string | null {
  if (parcial == null || total == null) return null;
  if (parcial <= 0 || total <= 0 || parcial >= total) return null;
  return plantilla(parcial, total);
}

/**
 * Descripción para el cliente con parcialidad expresada por cantidades.
 *
 * Para los estados parciales, si hay conteos disponibles genera un texto del
 * tipo «2 de 3 paquetes…»; si no, devuelve el texto de respaldo sin números
 * («Algunos paquetes…»). Nunca inventa cantidades.
 */
export function describirEstadoCliente(
  estado: EstadoGuiaMaster,
  conteos?: ConteosGuiaCliente,
): string {
  const fallback = ESTADO_GUIA_MASTER_CATALOGO[estado].descripcionCliente;
  if (!conteos) return fallback;

  switch (estado) {
    case 'RECEPCION_PARCIAL':
      return (
        fraseConteo(
          conteos.recibidos,
          conteos.totalEsperado,
          (x, n) =>
            `${x} de ${n} paquetes de tu guía ya llegaron a nuestra bodega en Ecuador.`,
        ) ?? fallback
      );
    case 'DESPACHO_PARCIAL':
      return (
        fraseConteo(
          conteos.despachados,
          conteos.totalEsperado,
          (x, n) =>
            `${x} de ${n} paquetes de tu guía ya salieron hacia el lugar de entrega o retiro.`,
        ) ?? fallback
      );
    // ENVIO_PARCIAL no dispone de un conteo de «enviados»: usa el respaldo.
    default:
      return fallback;
  }
}

// ---------------------------------------------------------------------------
// Mapas derivados (compatibilidad con consumidores existentes). NO duplican
// datos: se construyen a partir del catálogo único.
// ---------------------------------------------------------------------------

function mapearCatalogo<T>(pick: (def: EstadoGuiaMasterDef) => T): Record<EstadoGuiaMaster, T> {
  const out = {} as Record<EstadoGuiaMaster, T>;
  (Object.keys(ESTADO_GUIA_MASTER_CATALOGO) as EstadoGuiaMaster[]).forEach((estado) => {
    out[estado] = pick(ESTADO_GUIA_MASTER_CATALOGO[estado]);
  });
  return out;
}

/** Etiquetas internas (administración). */
export const GUIA_MASTER_ESTADO_LABELS = mapearCatalogo((d) => d.etiquetaInterna);
export const GUIA_MASTER_ESTADO_LABELS_CORTOS = mapearCatalogo((d) => d.etiquetaInternaCorta);
export const GUIA_MASTER_ESTADO_DESCRIPCIONES = mapearCatalogo((d) => d.descripcionInterna);

/** Etiquetas para el cliente. */
export const MI_GUIA_ESTADO_LABELS = mapearCatalogo((d) => d.etiquetaCliente);
export const MI_GUIA_ESTADO_LABELS_CORTOS = mapearCatalogo((d) => d.etiquetaClienteCorta);
export const MI_GUIA_ESTADO_DESCRIPCIONES = mapearCatalogo((d) => d.descripcionCliente);

/** Tonos e iconos compartidos por ambas audiencias. */
export const GUIA_MASTER_ESTADO_TONES = mapearCatalogo((d) => d.tone);
export const GUIA_MASTER_ESTADO_ICONS = mapearCatalogo((d) => d.icon);
