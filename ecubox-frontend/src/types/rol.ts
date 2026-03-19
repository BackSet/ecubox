export interface PermisoDTO {
  id: number;
  codigo: string;
  descripcion: string | null;
}

export interface RolDTO {
  id: number;
  nombre: string;
  permisos: PermisoDTO[];
}

export interface RolPermisosUpdateRequest {
  permisoIds: number[];
}
