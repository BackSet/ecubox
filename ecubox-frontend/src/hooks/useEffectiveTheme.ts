import { useEffect, useState } from 'react';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Tema efectivo de ECUBOX (`'light' | 'dark'`), resolviendo `'system'` contra la
 * preferencia del sistema y reaccionando en vivo a cambios de tema o del sistema.
 * No dispara ninguna petición: solo recalcula en cliente.
 */
export function useEffectiveTheme(): 'light' | 'dark' {
  const theme = useThemeStore((s) => s.theme);
  const [systemDark, setSystemDark] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (theme === 'system') return systemDark ? 'dark' : 'light';
  return theme;
}
