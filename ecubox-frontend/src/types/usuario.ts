export interface UsuarioDTO {
  id: number;
  username: string;
  email: string | null;
  enabled: boolean;
  roles: string[];
}

export interface UsuarioCreateRequest {
  username: string;
  password: string;
  email?: string;
  enabled: boolean;
  roleIds: number[];
}

export interface UsuarioUpdateRequest {
  password?: string;
  email?: string;
  enabled?: boolean;
  roleIds?: number[];
}
