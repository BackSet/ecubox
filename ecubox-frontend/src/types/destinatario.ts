export interface DestinatarioFinal {
  id: number;
  nombre: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  codigo?: string;
}

export interface DestinatarioFinalRequest {
  nombre: string;
  telefono?: string;
  direccion?: string;
  provincia?: string;
  canton?: string;
  codigo?: string;
}
