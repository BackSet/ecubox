import type { Paquete } from '@/types/paquete';

export interface LoteRecepcion {
  id: number;
  fechaRecepcion: string;
  observaciones?: string;
  operarioId?: number;
  operarioNombre?: string;
  numeroGuiasEnvio: string[];
  paquetes?: Paquete[];
  totalPaquetes?: number;
}

export interface LoteRecepcionCreateRequest {
  fechaRecepcion?: string;
  observaciones?: string;
  numeroGuiasEnvio: string[];
}
