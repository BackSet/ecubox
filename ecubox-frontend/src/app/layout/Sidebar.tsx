import { useEffect, useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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

export function Sidebar({ onNavigate, mobile = false }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission } = useAuthStore();
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

      <nav
        className="flex-1 overflow-y-auto overscroll-contain p-1.5"
        aria-label="Navegación principal"
      >
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
                      'group/item relative flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                      active
                        ? 'bg-[var(--color-sidebar-active)]/10 text-[var(--color-primary)] font-semibold'
                        : 'text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-sidebar-hover)]',
                      effectiveCollapsed && 'justify-center px-0'
                    )}
                  >
                    {active && !effectiveCollapsed && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-[var(--color-primary)]"
                        aria-hidden
                      />
                    )}
                    <Icon className="h-5 w-5 shrink-0" />
                    {!effectiveCollapsed && <span className="min-w-0 truncate">{label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

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
