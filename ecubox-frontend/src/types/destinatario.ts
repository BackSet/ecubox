export interface DestinatarioFinal {
  id: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  codigo?: string;
  clienteUsuarioId?: number | null;
  clienteUsuarioNombre?: string | null;
}

export interface DestinatarioFinalRequest {
  nombre: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  codigo?: string;
}
