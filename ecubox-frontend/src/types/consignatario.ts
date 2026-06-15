export interface Consignatario {
  id: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  codigo?: string;
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
  clienteUsuarioId?: number;
}
