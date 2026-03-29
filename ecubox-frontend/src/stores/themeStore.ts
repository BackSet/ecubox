import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const effective = resolveTheme(theme);
  root.dataset.theme = theme;
  root.style.colorScheme = effective;
  if (effective === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export { applyTheme };

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem('ecubox_theme');
    if (!raw) return 'system';
    const parsed = JSON.parse(raw) as { state?: { theme?: Theme } };
    const saved = parsed.state?.theme;
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  } catch {
    return 'system';
  }
}

let systemListenerAttached = false;

function attachSystemThemeListener() {
  if (typeof window === 'undefined' || systemListenerAttached) return;
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    const current = useThemeStore.getState().theme;
    if (current === 'system') applyTheme('system');
  };
  media.addEventListener('change', listener);
  systemListenerAttached = true;
}

export function initializeTheme() {
  const storedTheme = readStoredTheme();
  applyTheme(storedTheme);
  attachSystemThemeListener();
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const current = get().theme;
        const next = current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: 'ecubox_theme',
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        applyTheme(state.theme);
        attachSystemThemeListener();
      },
    }
  )
);
