import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EcuboxLogo } from '@/components/brand';
import { getVisibleNavGroups } from '@/app/navigation/dashboardNav';

interface SidebarProps {
  onNavigate?: () => void;
  mobile?: boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'ecubox_sidebar_collapsed';

function readCollapsedFromStorage(mobile: boolean): boolean {
  if (mobile || typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function Sidebar({ onNavigate, mobile = false }: SidebarProps) {
  // Lazy initializer: lee localStorage de forma síncrona en el PRIMER render
  // para evitar el flash visual que ocurría cuando MainLayout se remonta en
  // cada navegación (ver routes/router.tsx -> withDashboardLayout). Sin esto,
  // el sidebar arrancaba expandido (false) y luego se animaba a colapsado.
  const [collapsed, setCollapsed] = useState<boolean>(() =>
    readCollapsedFromStorage(mobile),
  );
  const { hasPermission } = useAuthStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
        effectiveCollapsed ? 'w-[56px]' : 'w-[240px]',
        mobile && 'w-full max-w-[320px]'
      )}
    >
      <div className="flex h-12 shrink-0 items-center px-3">
        <Link
          to="/inicio"
          onClick={handleNavigate}
          className="flex items-center flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity"
          aria-label="ECUBOX - Dashboard"
        >
          <EcuboxLogo variant="light" size="md" asLink={false} iconOnly={effectiveCollapsed} />
        </Link>
      </div>

      <nav
        className="flex-1 overflow-y-auto overscroll-contain px-2 pb-2"
        aria-label="Navegación principal"
      >
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {!effectiveCollapsed && (
              <div
                className={cn(
                  'px-2 pb-1 text-[11px] font-medium tracking-wide text-[var(--color-muted-foreground)]',
                  groupIndex === 0 ? 'pt-3' : 'pt-5'
                )}
              >
                {group.label}
              </div>
            )}
            {effectiveCollapsed && groupIndex > 0 && (
              <div
                className="my-2 border-t border-[var(--color-sidebar-border)]/70"
                aria-hidden
              />
            )}
            <div className="space-y-0.5">
              {group.items.map(({ to, label, icon: Icon, exact }) => {
                const active = isActive(to, exact);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={handleNavigate}
                    activeOptions={{ exact: !!exact }}
                    title={label}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group/item relative flex h-8 min-w-0 items-center gap-2 rounded-md px-2 text-[13px] transition-colors',
                      active
                        ? 'bg-[var(--color-sidebar-hover)] font-medium text-[var(--color-foreground)]'
                        : 'font-normal text-[var(--color-sidebar-foreground)]/85 hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-foreground)]',
                      effectiveCollapsed && 'justify-center px-0'
                    )}
                  >
                    {active && !effectiveCollapsed && (
                      <span
                        className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r bg-[var(--color-primary)]"
                        aria-hidden
                      />
                    )}
                    <Icon className="h-4 w-4 shrink-0" />
                    {!effectiveCollapsed && <span className="min-w-0 truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!mobile && (
        <div className="shrink-0 border-t border-[var(--color-sidebar-border)]/70 p-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-8 w-8 text-[var(--color-muted-foreground)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-foreground)]',
              effectiveCollapsed ? 'mx-auto' : 'ml-auto'
            )}
            onClick={handleToggleCollapsed}
            aria-label={effectiveCollapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          >
            {effectiveCollapsed ? (
              <ChevronsRight className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <ChevronsLeft className="h-4 w-4" strokeWidth={1.75} />
            )}
          </Button>
        </div>
      )}
    </aside>
  );
}
