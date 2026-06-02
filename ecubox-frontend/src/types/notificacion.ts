export interface NotificacionUsuario {
  id: number;
  tipo: string;
  titulo: string;
  mensaje: string;
  url: string | null;
  leida: boolean;
  createdAt: string;
  readAt: string | null;
  paqueteId: number | null;
  numeroGuia: string | null;
}

export interface NotificacionesUnreadCount {
  count: number;
}
