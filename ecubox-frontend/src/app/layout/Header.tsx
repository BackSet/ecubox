import { Link, useNavigate } from '@tanstack/react-router';
import {
  Search,
  Bell,
  LogOut,
  PanelLeftOpen,
  UserCircle,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onOpenSearch?: () => void;
  onOpenSidebar?: () => void;
  shortcutLabel?: string;
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

export function Header({ onOpenSearch, onOpenSidebar, shortcutLabel = 'Ctrl+K' }: HeaderProps) {
  const navigate = useNavigate();
  const { username, email, roles, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const handleLogout = () => {
    logout();
    navigate({ to: '/' });
  };

  const handleToggleTheme = (event: Event) => {
    event.preventDefault();
    toggleTheme();
  };

  const initials = getInitials(username);
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;
  const themeLabel =
    theme === 'dark' ? 'Tema oscuro' : theme === 'light' ? 'Tema claro' : 'Tema del sistema';

  return (
    <header className="dashboard-topbar sticky top-0 z-40 flex h-12 shrink-0 items-center gap-3 px-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="dashboard-topbar-action shrink-0 rounded-lg lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Abrir menú principal"
      >
        <PanelLeftOpen className="h-5 w-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onOpenSearch}
        className="dashboard-topbar-search flex h-9 flex-1 items-center justify-start gap-2 rounded-lg px-3 text-left text-sm font-medium"
        aria-label="Buscar (abre paleta de comandos)"
      >
        <Search className="dashboard-topbar-search-icon h-4 w-4 shrink-0" />
        <span className="dashboard-topbar-search-label">Buscar...</span>
        <kbd className="dashboard-topbar-kbd ml-auto hidden rounded px-1.5 text-[10px] font-semibold sm:inline-block">
          {shortcutLabel}
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="dashboard-topbar-action shrink-0 rounded-lg"
        aria-label="Notificaciones"
        title="Notificaciones (próximamente)"
      >
        <Bell className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="dashboard-topbar-user group flex shrink-0 items-center gap-2 rounded-full pl-1 pr-2 py-1 transition-all hover:bg-[var(--color-muted)]"
            aria-label="Menú de usuario"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[#7B3FE4] text-sm font-semibold text-white shadow-sm ring-2 ring-[var(--color-background)]"
              aria-hidden
            >
              {initials}
            </span>
            <span className="hidden max-w-[140px] truncate text-left text-sm font-semibold sm:block">
              {username ?? 'Usuario'}
            </span>
            <ChevronDown className="hidden h-3.5 w-3.5 text-[var(--color-muted-foreground)] transition-transform group-data-[state=open]:rotate-180 sm:block" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            className="min-w-[260px] rounded-xl border border-[var(--color-border)] bg-[var(--color-popover)] p-2 shadow-lg"
            sideOffset={8}
            align="end"
          >
            <div className="flex items-start gap-3 px-2 py-2.5">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[#7B3FE4] text-sm font-semibold text-white shadow"
                aria-hidden
              >
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--color-popover-foreground)]">
                  {username ?? 'Usuario'}
                </p>
                <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {email ?? 'Sin correo configurado'}
                </p>
                {roles.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {roles.map((role) => (
                      <Badge
                        key={role}
                        variant="secondary"
                        className="text-[10px] uppercase tracking-wide"
                      >
                        {role}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <DropdownMenuSeparator className="my-1.5 h-px bg-[var(--color-border)]" />
            <DropdownMenuItem
              asChild
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-[var(--color-foreground)] outline-none hover:bg-[var(--color-muted)] focus:bg-[var(--color-muted)]"
            >
              <Link to="/perfil" className="flex w-full items-center gap-2">
                <UserCircle className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                Mi perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-[var(--color-foreground)] outline-none hover:bg-[var(--color-muted)] focus:bg-[var(--color-muted)]"
              onSelect={handleToggleTheme}
            >
              <ThemeIcon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <span className="flex-1">{themeLabel}</span>
              <span className="text-[10px] uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Cambiar
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1.5 h-px bg-[var(--color-border)]" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-[var(--color-destructive)] outline-none hover:bg-[var(--color-destructive)]/10 focus:bg-[var(--color-destructive)]/10"
              onSelect={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </header>
  );
}
