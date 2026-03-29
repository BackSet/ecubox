import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import {
  LayoutDashboard,
  Users,
  Shield,
  Key,
  Search,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  MapPin,
  Package,
  Weight,
  Tag,
  Truck,
  Building2,
  PackageCheck,
  ClipboardList,
  FileText,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { EcuboxLogo } from '@/components/brand';

interface SidebarProps {
  onOpenSearch?: () => void;
}

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  permission?: string;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Principal',
    items: [{ to: '/inicio', label: 'Inicio', icon: LayoutDashboard, exact: true }],
  },
  {
    label: 'Operaciones',
    items: [
      { to: '/destinatarios', label: 'Mis Destinatarios', icon: MapPin, permission: 'DESTINATARIOS_READ' },
      { to: '/paquetes', label: 'Mis Paquetes', icon: Package, permission: 'PAQUETES_READ' },
      { to: '/cargar-pesos', label: 'Cargar pesos', icon: Weight, permission: 'PAQUETES_PESO_WRITE' },
      { to: '/gestionar-estados-paquetes', label: 'Gestionar estados de paquetes', icon: Tag, permission: 'PAQUETES_PESO_WRITE' },
      { to: '/despachos', label: 'Despachos', icon: Truck, permission: 'DESPACHOS_WRITE' },
      { to: '/lotes-recepcion', label: 'Lotes de recepción', icon: ClipboardList, permission: 'DESPACHOS_WRITE' },
    ],
  },
  {
    label: 'Catálogos',
    items: [
      { to: '/agencias', label: 'Agencias', icon: Building2, permission: 'AGENCIAS_READ' },
      { to: '/agencias-distribuidor', label: 'Agencias de distribuidor', icon: Building2, permission: 'AGENCIAS_DISTRIBUIDOR_READ' },
      { to: '/distribuidores', label: 'Distribuidores', icon: PackageCheck, permission: 'DISTRIBUIDORES_READ' },
      { to: '/manifiestos', label: 'Manifiestos', icon: FileText, permission: 'MANIFIESTOS_READ' },
    ],
  },
  {
    label: 'Administración',
    items: [
      { to: '/usuarios', label: 'Usuarios', icon: Users, permission: 'USUARIOS_READ' },
      { to: '/roles', label: 'Roles', icon: Shield, permission: 'ROLES_READ' },
      { to: '/permisos', label: 'Permisos', icon: Key, permission: 'PERMISOS_READ' },
    ],
  },
  {
    label: 'Configuración',
    items: [{ to: '/parametros-sistema', label: 'Parámetros sistema', icon: Settings, permission: 'DESPACHOS_WRITE' }],
  },
];

export function Sidebar({ onOpenSearch }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { hasPermission } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const canSeeItem = (item: NavItem) => {
    if (!item.permission) return true;
    return hasPermission(item.permission);
  };

  const visibleGroups = NAV_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.filter(canSeeItem),
  })).filter((group) => group.items.length > 0);

  const isActive = (to: string, exact?: boolean) => {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + '/');
  };

  return (
    <aside
      className={cn(
        'group relative flex flex-col border-r border-[var(--color-sidebar-border)] bg-[var(--color-sidebar-background)] transition-[width] duration-200 ease-out',
        collapsed ? 'w-[52px]' : 'w-[220px]'
      )}
    >
      <div className="flex h-12 shrink-0 items-center border-b border-[var(--color-sidebar-border)] px-2.5">
        <Link
          to="/inicio"
          className="flex items-center flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity"
          aria-label="ECUBOX - Dashboard"
        >
          <EcuboxLogo variant="light" size="md" asLink={false} iconOnly={collapsed} />
        </Link>
      </div>

      {onOpenSearch && (
        <div className="p-2">
          <Button
            variant="ghost"
            size={collapsed ? 'icon' : 'default'}
            className={cn(
              'w-full justify-start gap-2 text-[var(--color-sidebar-foreground)]',
              collapsed && 'px-0'
            )}
            onClick={onOpenSearch}
            aria-label="Buscar"
            title={collapsed ? 'Buscar (Ctrl+K)' : undefined}
          >
            <Search className="h-5 w-5 shrink-0" />
            {!collapsed && (
              <>
                <span>Buscar</span>
                <kbd className="ml-auto hidden rounded bg-[var(--color-muted)] px-1.5 text-[10px] font-medium sm:inline-block">
                  ⌘K
                </kbd>
              </>
            )}
          </Button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto p-1.5">
        {visibleGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && (
              <div
                className={cn(
                  'border-t border-[var(--color-sidebar-border)]/50',
                  collapsed ? 'my-1' : 'mt-2 pt-2'
                )}
                aria-hidden
              />
            )}
            {!collapsed && (
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
                  activeOptions={{ exact: !!exact }}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-2 rounded-md px-2 py-1.5 text-[13px] font-medium transition-colors',
                    isActive(to, exact)
                      ? 'bg-[var(--color-sidebar-active)]/10 text-[var(--color-primary)] font-semibold'
                      : 'text-[var(--color-sidebar-foreground)] hover:bg-[var(--color-sidebar-hover)]',
                    collapsed && 'justify-center px-0'
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--color-sidebar-border)] p-2">
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'default'}
          className={cn(
            'w-full justify-start gap-2 text-[var(--color-sidebar-foreground)]',
            collapsed && 'px-0'
          )}
          onClick={toggleTheme}
          aria-label="Cambiar tema"
          title={collapsed ? (theme === 'dark' ? 'Tema oscuro' : theme === 'light' ? 'Tema claro' : 'Tema del sistema') : undefined}
        >
          {theme === 'dark' ? (
            <Moon className="h-5 w-5 shrink-0" />
          ) : theme === 'system' ? (
            <Monitor className="h-5 w-5 shrink-0" />
          ) : (
            <Sun className="h-5 w-5 shrink-0" />
          )}
          {!collapsed && (
            <span>
              {theme === 'dark' ? 'Tema oscuro' : theme === 'light' ? 'Tema claro' : 'Tema del sistema'}
            </span>
          )}
        </Button>
      </div>

      <Button
        variant="secondary"
        size="icon"
        className="absolute -right-3 top-16 z-10 h-6 w-6 rounded-full border border-[var(--color-border)] opacity-0 shadow hover:opacity-100 focus:opacity-100 [.group:hover_&]:opacity-100"
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </Button>
    </aside>
  );
}
