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
  roles: string[];
  permissions: string[];
}
