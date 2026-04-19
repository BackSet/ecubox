import { useEffect, useState } from 'react';
import { Toaster as SonnerToaster } from 'sonner';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
} from 'lucide-react';
import { useThemeStore } from '@/stores/themeStore';

type ResolvedTheme = 'light' | 'dark';

function resolveSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function useResolvedTheme(): ResolvedTheme {
  const theme = useThemeStore((s) => s.theme);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(resolveSystemTheme);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => setSystemTheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  return theme === 'system' ? systemTheme : theme;
}

function useIsSmallScreen(): boolean {
  const [isSmall, setIsSmall] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 639px)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 639px)');
    const handler = () => setIsSmall(media.matches);
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  return isSmall;
}

/**
 * Toaster global del proyecto. Envuelve `sonner` aplicando los tokens de
 * diseño (mismos colores que `--color-card`, `--color-success`, etc.),
 * iconos de `lucide-react` y posición responsive que evita el header,
 * el sidebar móvil y los diálogos centrados.
 */
export function AppToaster() {
  const theme = useResolvedTheme();
  const isSmall = useIsSmallScreen();

  const position = isSmall ? 'top-center' : 'bottom-right';
  const offset = isSmall
    ? { top: 'calc(env(safe-area-inset-top, 0px) + 64px)' }
    : { right: 16, bottom: 24 };

  return (
    <SonnerToaster
      theme={theme}
      position={position}
      offset={offset}
      closeButton
      visibleToasts={3}
      gap={10}
      toastOptions={{
        duration: 3000,
        classNames: {
          toast:
            'group toast pointer-events-auto !bg-[var(--color-card)] !text-[var(--color-foreground)] !border !border-[var(--color-border)] !shadow-lg !rounded-lg !gap-2 !p-3.5',
          title: '!text-[13px] !font-medium !text-[var(--color-foreground)] !leading-snug',
          description: '!text-[12px] !text-[var(--color-muted-foreground)] !leading-snug',
          icon: '!w-4 !h-4 !flex !items-center !justify-center !mr-1',
          actionButton:
            '!bg-[var(--color-primary)] !text-[var(--color-primary-foreground)] !rounded-md !text-[12px] !px-2.5 !py-1 !font-medium hover:!opacity-90',
          cancelButton:
            '!bg-[var(--color-muted)] !text-[var(--color-muted-foreground)] !rounded-md !text-[12px] !px-2.5 !py-1 !font-medium',
          closeButton:
            '!bg-[var(--color-card)] !text-[var(--color-muted-foreground)] !border !border-[var(--color-border)] hover:!bg-[var(--color-muted)] !rounded-full',
          success:
            '!border-[color-mix(in_oklab,var(--color-success)_45%,var(--color-border))]',
          error:
            '!border-[color-mix(in_oklab,var(--color-error)_45%,var(--color-border))]',
          warning:
            '!border-[color-mix(in_oklab,var(--color-warning)_45%,var(--color-border))]',
          info:
            '!border-[color-mix(in_oklab,var(--color-info)_45%,var(--color-border))]',
          loading: '!border-[var(--color-border)]',
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-4 w-4 text-[var(--color-success)]" strokeWidth={2.25} />,
        error: <AlertCircle className="h-4 w-4 text-[var(--color-error)]" strokeWidth={2.25} />,
        warning: <AlertTriangle className="h-4 w-4 text-[var(--color-warning)]" strokeWidth={2.25} />,
        info: <Info className="h-4 w-4 text-[var(--color-info)]" strokeWidth={2.25} />,
        loading: (
          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-muted-foreground)]" strokeWidth={2.25} />
        ),
      }}
    />
  );
}
