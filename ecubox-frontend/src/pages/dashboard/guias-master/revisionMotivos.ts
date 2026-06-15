/**
 * Motivos estructurados para enviar una guía master a revisión.
 *
 * El backend mantiene el motivo como texto libre (campo `motivo` del historial),
 * así que serializamos el código estructurado + la observación opcional en una
 * sola cadena `CODIGO: observación` (o solo `CODIGO`). Esto da trazabilidad sin
 * crear migraciones ni cambiar el modelo. La bandeja "En revisión" parsea de
 * vuelta para mostrar una etiqueta legible.
 */
export type MotivoRevisionCodigo =
  | 'DATOS_INCONSISTENTES'
  | 'CONSIGNATARIO_INCORRECTO'
  | 'TOTAL_PAQUETES_INCORRECTO'
  | 'NUMERO_GUIA_DUDOSO'
  | 'PAQUETES_REGISTRADOS_ANTES_DE_APROBACION'
  | 'OTRO';

export interface MotivoRevisionOpcion {
  codigo: MotivoRevisionCodigo;
  label: string;
  /** Cuando true, la observación es obligatoria (caso OTRO). */
  requiereObservacion?: boolean;
}

export const MOTIVOS_REVISION: readonly MotivoRevisionOpcion[] = [
  { codigo: 'DATOS_INCONSISTENTES', label: 'Datos inconsistentes' },
  { codigo: 'CONSIGNATARIO_INCORRECTO', label: 'Consignatario incorrecto' },
  { codigo: 'TOTAL_PAQUETES_INCORRECTO', label: 'Total de paquetes incorrecto' },
  { codigo: 'NUMERO_GUIA_DUDOSO', label: 'Número de guía dudoso' },
  {
    codigo: 'PAQUETES_REGISTRADOS_ANTES_DE_APROBACION',
    label: 'Paquetes registrados antes de aprobación',
  },
  { codigo: 'OTRO', label: 'Otro', requiereObservacion: true },
];

const LABEL_BY_CODIGO: Record<string, string> = Object.fromEntries(
  MOTIVOS_REVISION.map((m) => [m.codigo, m.label]),
);

const CODIGOS = new Set<string>(MOTIVOS_REVISION.map((m) => m.codigo));

/** Serializa el motivo estructurado + observación opcional en el campo de texto libre. */
export function serializarMotivoRevision(
  codigo: MotivoRevisionCodigo,
  observacion?: string,
): string {
  const obs = (observacion ?? '').trim();
  return obs ? `${codigo}: ${obs}` : codigo;
}

export interface MotivoRevisionParseado {
  codigo: MotivoRevisionCodigo | null;
  observacion: string;
  /** Etiqueta legible: el label del código + la observación si existe; o el texto crudo. */
  label: string;
}

/**
 * Parsea un motivo serializado de vuelta a código + observación legible. Es
 * tolerante con motivos antiguos en texto libre (sin código): en ese caso
 * `codigo` es null y `label` es el texto tal cual.
 */
export function parsearMotivoRevision(motivo?: string | null): MotivoRevisionParseado {
  const raw = (motivo ?? '').trim();
  if (!raw) return { codigo: null, observacion: '', label: '' };
  const sepIdx = raw.indexOf(':');
  const head = (sepIdx >= 0 ? raw.slice(0, sepIdx) : raw).trim();
  const tail = sepIdx >= 0 ? raw.slice(sepIdx + 1).trim() : '';
  if (CODIGOS.has(head)) {
    const codigo = head as MotivoRevisionCodigo;
    const baseLabel = LABEL_BY_CODIGO[head];
    return {
      codigo,
      observacion: tail,
      label: tail ? `${baseLabel}: ${tail}` : baseLabel,
    };
  }
  // Motivo libre antiguo (sin código estructurado).
  return { codigo: null, observacion: '', label: raw };
}
