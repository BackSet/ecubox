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
}

export interface ConsignatarioRequest {
  nombre: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  codigo?: string;
}
