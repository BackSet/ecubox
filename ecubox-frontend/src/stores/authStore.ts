import { create } from 'zustand';
import type { LoginResponse } from '@/types/auth';
import { getCurrentUser } from '@/lib/api/auth.service';

interface AuthState {
  token: string | null;
  username: string | null;
  email: string | null;
  createdAt: string | null;
  roles: string[];
  permissions: string[];
  setAuth: (data: LoginResponse) => void;
  refreshAuth: () => Promise<void>;
  setProfile: (data: Pick<LoginResponse, 'username' | 'email' | 'createdAt' | 'roles' | 'permissions'>) => void;
  setToken: (token: string | null) => void;
  logout: () => void;
  hasRole: (role: string) => boolean;
  hasPermission: (code: string) => boolean;
}

const AUTH_KEY = 'ecubox_auth';

type StoredProfile = Pick<AuthState, 'token' | 'username' | 'email' | 'createdAt' | 'roles' | 'permissions'>;

function loadStored(): StoredProfile {
  if (typeof localStorage === 'undefined') {
    return { token: null, username: null, email: null, createdAt: null, roles: [], permissions: [] };
  }
  const token = localStorage.getItem('token');
  if (!token) {
    return { token: null, username: null, email: null, createdAt: null, roles: [], permissions: [] };
  }
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { token, username: null, email: null, createdAt: null, roles: [], permissions: [] };
    const { username, email, createdAt, roles, permissions } = JSON.parse(raw) as {
      username?: string | null;
      email?: string | null;
      createdAt?: string | null;
      roles?: string[];
      permissions?: string[];
    };
    return {
      token,
      username: username ?? null,
      email: email ?? null,
      createdAt: createdAt ?? null,
      roles: Array.isArray(roles) ? roles : [],
      permissions: Array.isArray(permissions) ? permissions : [],
    };
  } catch {
    return { token, username: null, email: null, createdAt: null, roles: [], permissions: [] };
  }
}

function persistProfile(data: Pick<LoginResponse, 'username' | 'email' | 'createdAt' | 'roles' | 'permissions'>) {
  localStorage.setItem(
    AUTH_KEY,
    JSON.stringify({
      username: data.username,
      email: data.email ?? null,
      createdAt: data.createdAt ?? null,
      roles: data.roles ?? [],
      permissions: data.permissions ?? [],
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
    });
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
