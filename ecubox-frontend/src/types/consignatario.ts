export interface Consignatario {
  id: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  codigo?: string;
  /** Etiqueta organizativa opcional (texto libre, máx. 60). No sustituye al nombre. */
  etiqueta?: string | null;
  clienteUsuarioId?: number | null;
  clienteUsuarioNombre?: string | null;
  /** Conteos de envíos (solo en listados de cliente/enlace "Mis destinatarios"). */
  totalGuias?: number | null;
  totalPaquetes?: number | null;
}

export interface ConsignatarioRequest {
  nombre: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  codigo?: string;
  etiqueta?: string;
  clienteUsuarioId?: number;
}
