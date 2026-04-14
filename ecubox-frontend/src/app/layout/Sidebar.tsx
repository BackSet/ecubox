import { useEffect, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EcuboxLogo } from '@/components/brand';
import { getVisibleNavGroups } from '@/app/navigation/dashboardNav';

interface SidebarProps {
  onOpenSearch?: () => void;
  onNavigate?: () => void;
  shortcutLabel?: string;
  mobile?: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'ecubox_sidebar_collapsed';

export function Sidebar({ onOpenSearch, onNavigate, shortcutLabel = 'Ctrl+K', mobile = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (mobile || typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (stored === '1') setCollapsed(true);
    } catch {
      // Silent fallback: state lives in memory only.
    }
  }, [mobile]);

  const visibleGroups = getVisibleNavGroups(hasPermission);

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + '/');
  };

  const effectiveCollapsed = mobile ? false : collapsed;

  const handleToggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // Silent fallback if storage is blocked.
      }
      return next;
    });
  };

  const handleNavigate = () => {
    onNavigate?.();
  };

  return (
    <aside
      className={cn(
        'group relative flex h-full flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-background)] transition-[width] duration-200 ease-out motion-reduce:transition-none',
        effectiveCollapsed ? 'w-[56px]' : 'w-[264px]',
        mobile && 'w-full max-w-[320px]'
      )}
    >
      <div className="flex h-12 shrink-0 items-center border-b border-[var(--color-sidebar-border)] px-2.5">
        <Link
          to="/inicio"
          onClick={handleNavigate}
          className="flex items-center flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity"
          aria-label="ECUBOX - Dashboard"
        >
          <EcuboxLogo variant="light" size="md" asLink={false} iconOnly={effectiveCollapsed} />
        </Link>
      </div>

      {onOpenSearch && (
        <div className="p-2">
          <Button
            variant="ghost"
            size={effectiveCollapsed ? 'icon' : 'default'}
            className={cn(
              'w-full justify-start gap-2 text-[var(--color-sidebar-foreground)]',
              effectiveCollapsed && 'px-0'
            )}
            onClick={() => {
              onOpenSearch();
              if (mobile) onNavigate?.();
            }}
            aria-label="Buscar"
            title={effectiveCollapsed ? `Buscar (${shortcutLabel})` : undefined}
          >
            <Search className="h-5 w-5 shrink-0" />
            {!effectiveCollapsed && (
              <>
                <span>Buscar</span>
                <kbd className="ml-auto hidden rounded bg-[var(--color-muted)] px-1.5 text-[10px] font-medium sm:inline-block">
                  {shortcutLabel}
                </kbd>
              </>
            )}
          </Button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-1.5" aria-label="Navegación principal">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && (
              <div
                className={cn(
                  'border-t border-[var(--color-sidebar-border)]/50',
                  effectiveCollapsed ? 'my-1' : 'mt-2 pt-2'
                )}
                aria-hidden
              />
            )}
            {!effectiveCollapsed && (
              <div
                className={cn(
                  'px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-sidebar-foreground)]/55',
                  groupIndex === 0 ? 'pt-1' : 'pt-3'
                )}
              >
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={handleNavigate}
                  activeOptions={{ exact: !!exact }}
                  title={label}
                  aria-current={isActive(to, exact) ? 'page' : undefined}
                  className={cn(
                    'flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                    isActive(to, exact)
                      ? 'bg-[var(--color-sidebar-active)]/10 text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-sidebar-hover)]',
                    effectiveCollapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!effectiveCollapsed && <span className="min-w-0 truncate">{label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-sidebar-border)] p-2">
        <Button
          variant="ghost"
          size={effectiveCollapsed ? 'icon' : 'default'}
          className={cn(
            'w-full justify-start gap-2 text-[var(--color-sidebar-foreground)]',
            effectiveCollapsed && 'px-0'
          )}
          onClick={toggleTheme}
          aria-label="Cambiar tema"
          title={effectiveCollapsed ? (theme === 'dark' ? 'Tema oscuro' : theme === 'light' ? 'Tema claro' : 'Tema del sistema') : undefined}
        >
          {theme === 'dark' ? (
            <Moon className="h-5 w-5 shrink-0" />
          ) : theme === 'system' ? (
            <Monitor className="h-5 w-5 shrink-0" />
          ) : (
            <Sun className="h-5 w-5 shrink-0" />
          )}
          {!effectiveCollapsed && (
            <span>
              {theme === 'dark' ? 'Tema oscuro' : theme === 'light' ? 'Tema claro' : 'Tema del sistema'}
            </span>
          )}
        </Button>
      </div>

      {!mobile && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute -right-4 top-16 z-20 h-8 w-8 rounded-full border border-[var(--color-border)] shadow"
          onClick={handleToggleCollapsed}
          aria-label={effectiveCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
        >
          {effectiveCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      )}
    </aside>
  );
}
