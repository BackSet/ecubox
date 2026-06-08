export type TipoAccesoEnlace = 'PERSISTENTE' | 'TEMPORAL';

export interface ConsignatarioResumen {
  id: number;
  nombre: string;
  codigo: string | null;
}

export interface AccesoEnlace {
  id: number;
  /** Token en claro para reconstruir y copiar la URL del enlace. */
  token: string | null;
  tipo: TipoAccesoEnlace;
  etiqueta: string | null;
  expiraAt: string | null;
  createdAt: string;
  ultimoAccesoAt: string | null;
  vigente: boolean;
  consignatarios: ConsignatarioResumen[];
  creadoPor: string | null;
}

export interface GenerarAccesoEnlaceRequest {
  tipo: TipoAccesoEnlace;
  consignatarioIds: number[];
  /** Obligatorio para tipo TEMPORAL. El front convierte días a horas. */
  duracionHoras?: number;
  etiqueta?: string;
}

export interface GenerarAccesoEnlaceResponse {
  /** Token en claro; solo llega en esta respuesta. */
  token: string;
  enlace: AccesoEnlace;
}

export interface AccesoResumen {
  etiqueta: string | null;
  tipo: TipoAccesoEnlace;
  expiraAt: string | null;
  consignatarios: ConsignatarioResumen[];
}

export interface CanjearAccesoResponse {
  /** JWT de solo lectura para guías y consignatarios asociados al enlace. */
  token: string;
  resumen: AccesoResumen;
}
