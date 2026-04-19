/**
 * Respuesta paginada estable que comparten todos los listados del backend.
 * Coincide con el DTO `PageResponse<T>` del backend (no con el `Page<T>` crudo
 * de Spring, que serializa campos volatiles `pageable`/`sort`).
 */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

/** Parámetros estándar para los listados paginados con búsqueda libre. */
export interface PageQuery {
  q?: string;
  page?: number;
  size?: number;
}
