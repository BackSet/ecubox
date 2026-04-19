import { Link, useNavigate } from '@tanstack/react-router';
import {
  Search,
  Bell,
  LogOut,
  PanelLeftOpen,
  UserCircle,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';
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
    <header className="dashboard-topbar sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 px-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="dashboard-topbar-action h-8 w-8 shrink-0 rounded-md lg:hidden"
        onClick={onOpenSidebar}
        aria-label="Abrir menú principal"
      >
        <PanelLeftOpen className="h-4 w-4" strokeWidth={1.75} />
      </Button>
      <Button
        type="button"
        variant="ghost"
        onClick={onOpenSearch}
        className="dashboard-topbar-search flex h-8 w-full max-w-[420px] items-center justify-start gap-2 rounded-md px-2.5 text-left text-[13px] font-normal"
        aria-label="Buscar (abre paleta de comandos)"
      >
        <Search className="dashboard-topbar-search-icon h-4 w-4 shrink-0" strokeWidth={1.75} />
        <span className="dashboard-topbar-search-label">Buscar...</span>
        <kbd className="dashboard-topbar-kbd ml-auto hidden rounded px-1.5 py-0.5 text-[10px] font-medium sm:inline-block">
          {shortcutLabel}
        </kbd>
      </Button>

      <div className="ml-auto flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="dashboard-topbar-action h-8 w-8 shrink-0 rounded-md"
          aria-label="Notificaciones"
          title="Notificaciones (próximamente)"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="dashboard-topbar-user h-8 w-8 shrink-0 rounded-md p-0"
              aria-label="Menú de usuario"
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-foreground)] text-[11px] font-medium text-[var(--color-background)]"
                aria-hidden
              >
                {initials}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuPortal>
            <DropdownMenuContent
              className="min-w-[260px] rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-1.5 shadow-none"
              sideOffset={8}
              align="end"
            >
              <div className="flex items-start gap-2.5 px-2 py-2">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[var(--color-foreground)] text-xs font-medium text-[var(--color-background)]"
                  aria-hidden
                >
                  {initials}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-[var(--color-popover-foreground)]">
                    {username ?? 'Usuario'}
                  </p>
                  <p className="truncate text-[12px] text-[var(--color-muted-foreground)]">
                    {email ?? 'Sin correo configurado'}
                  </p>
                  {roles.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {roles.map((role) => (
                        <span
                          key={role}
                          className="inline-flex items-center rounded-md bg-[var(--color-muted)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-foreground)]"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator className="my-1 h-px bg-[var(--color-border)]" />
              <DropdownMenuItem
                asChild
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[var(--color-foreground)] outline-none hover:bg-[var(--color-muted)] focus:bg-[var(--color-muted)]"
              >
                <Link to="/perfil" className="flex w-full items-center gap-2">
                  <UserCircle className="h-4 w-4 text-[var(--color-muted-foreground)]" strokeWidth={1.75} />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[var(--color-foreground)] outline-none hover:bg-[var(--color-muted)] focus:bg-[var(--color-muted)]"
                onSelect={handleToggleTheme}
              >
                <ThemeIcon className="h-4 w-4 text-[var(--color-muted-foreground)]" strokeWidth={1.75} />
                <span className="flex-1">{themeLabel}</span>
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  Cambiar
                </span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 h-px bg-[var(--color-border)]" />
              <DropdownMenuItem
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[var(--color-destructive)] outline-none hover:bg-[var(--color-destructive)]/10 focus:bg-[var(--color-destructive)]/10"
                onSelect={handleLogout}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenuPortal>
        </DropdownMenu>
      </div>
    </header>
  );
}
