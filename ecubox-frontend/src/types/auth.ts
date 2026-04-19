export interface LoginRequest {
  username: string;
  password: string;
}

export interface ClienteRegisterSimpleRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  username: string;
  email: string | null;
  createdAt: string | null;
  roles: string[];
  permissions: string[];
}

export interface MeUpdateRequest {
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}
