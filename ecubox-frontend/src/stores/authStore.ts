import { create } from 'zustand';
import type { LoginResponse } from '@/types/auth';
import { getCurrentUser } from '@/lib/api/auth.service';

/** Permisos de solo lectura otorgados a una sesión iniciada por enlace de acceso. */
const ACCESO_PERMISSIONS = [
  'CASILLERO_READ',
  'ACCESO_ENLACE_GUIAS_READ',
  'ACCESO_ENLACE_CONSIGNATARIOS_READ',
];

interface AuthState {
  token: string | null;
  username: string | null;
  email: string | null;
  createdAt: string | null;
  roles: string[];
  permissions: string[];
  /** true cuando la sesión proviene de un enlace de acceso (solo lectura, sin usuario). */
  isAcceso: boolean;
  setAuth: (data: LoginResponse) => void;
  /** Inicia una sesión de solo lectura a partir del canje de un enlace. */
  setAccesoSession: (data: { token: string; nombre: string }) => void;
  refreshAuth: () => Promise<void>;
  setProfile: (data: Pick<LoginResponse, 'username' | 'email' | 'createdAt' | 'roles' | 'permissions'>) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (code: string) => boolean;
}

const AUTH_KEY = 'ecubox_auth';

type StoredProfile = Pick<AuthState, 'token' | 'username' | 'email' | 'createdAt' | 'roles' | 'permissions' | 'isAcceso'>;

function loadStored(): StoredProfile {
  const empty: StoredProfile = {
    token: null, username: null, email: null, createdAt: null, roles: [], permissions: [], isAcceso: false,
  };
  if (typeof localStorage === 'undefined') return empty;
  const token = localStorage.getItem('token');
  if (!token) return empty;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { ...empty, token };
    const { username, email, createdAt, roles, permissions, isAcceso } = JSON.parse(raw) as {
      username?: string | null;
      email?: string | null;
      createdAt?: string | null;
      roles?: string[];
      permissions?: string[];
      isAcceso?: boolean;
    };
    return {
      token,
      username: username ?? null,
      email: email ?? null,
      createdAt: createdAt ?? null,
      roles: Array.isArray(roles) ? roles : [],
      permissions: Array.isArray(permissions) ? permissions : [],
      isAcceso: isAcceso === true,
    };
  } catch {
    return { ...empty, token };
  }
}

function persistProfile(
  data: Pick<LoginResponse, 'username' | 'email' | 'createdAt' | 'roles' | 'permissions'>,
  isAcceso = false,
) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      username: data.username,
      email: data.email ?? null,
      createdAt: data.createdAt ?? null,
      roles: data.roles ?? [],
      permissions: data.permissions ?? [],
      isAcceso,
    })
  );
}

const stored = loadStored();

export const useAuthStore = create<AuthState>((set, get) => ({
  token: stored.token,
  username: stored.username,
  email: stored.email,
  createdAt: stored.createdAt,
  roles: stored.roles,
  permissions: stored.permissions,
  isAcceso: stored.isAcceso,

  setAuth: (data: LoginResponse) => {
    localStorage.setItem('token', data.token);
    persistProfile(data);
    set({
      token: data.token,
      username: data.username,
      email: data.email ?? null,
      createdAt: data.createdAt ?? null,
      roles: data.roles ?? [],
      permissions: data.permissions ?? [],
      isAcceso: false,
    });
  },

  setAccesoSession: (data: { token: string; nombre: string }) => {
    const profile = {
      username: data.nombre,
      email: null,
      createdAt: null,
      roles: ['ACCESO_ENLACE'],
      permissions: ACCESO_PERMISSIONS,
    };
    localStorage.setItem('token', data.token);
    persistProfile(profile, true);
    set({ token: data.token, ...profile, isAcceso: true });
  },

  refreshAuth: async () => {
    const token = get().token;
    if (!token) return;
    const data = await getCurrentUser();
    persistProfile(data);
    set({
      username: data.username,
      email: data.email ?? null,
      createdAt: data.createdAt ?? null,
      roles: data.roles ?? [],
      permissions: data.permissions ?? [],
    });
  },

  setProfile: (data) => {
    persistProfile(data);
    set({
      username: data.username,
      email: data.email ?? null,
      createdAt: data.createdAt ?? null,
      roles: data.roles ?? [],
      permissions: data.permissions ?? [],
    });
  },

  setToken: (token) => {
    if (token) localStorage.setItem('token', token);
    else {
      localStorage.removeItem('token');
      localStorage.removeItem(AUTH_KEY);
    }
    set({ token });
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem(AUTH_KEY);
    set({
      token: null,
      username: null,
      email: null,
      createdAt: null,
      roles: [],
      permissions: [],
      isAcceso: false,
    });
  },

  hasRole: (role: string) => {
    const { roles } = get();
    return roles.includes(role);
  },

  hasPermission: (code: string) => {
    const { roles, permissions } = get();
    if (roles.includes('ADMIN')) return true;
    return permissions.includes(code);
  },
}));
