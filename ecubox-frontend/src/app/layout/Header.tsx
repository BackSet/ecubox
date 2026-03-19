import { useNavigate } from '@tanstack/react-router';
import { Search, Bell, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
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
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  return name.slice(0, 2).toUpperCase();
}

export function Header({ onOpenSearch }: HeaderProps) {
  const navigate = useNavigate();
  const { username, roles, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate({ to: '/' });
  };

  return (
    <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-background)] px-3">
      <Button
        type="button"
        variant="outline"
        onClick={onOpenSearch}
        className="flex flex-1 items-center justify-start gap-2 rounded-lg text-left text-sm text-[var(--color-muted-foreground)]"
        aria-label="Buscar (abre paleta de comandos)"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span>Buscar...</span>
        <kbd className="ml-auto hidden rounded bg-[var(--color-muted)] px-1.5 text-[10px] font-medium sm:inline-block">
          ⌘K
        </kbd>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 rounded-lg"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex shrink-0 items-center gap-2 rounded-full px-2 py-1"
            aria-label="Menú de usuario"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-foreground)]"
              aria-hidden
            >
              {getInitials(username)}
            </span>
            <span className="hidden max-w-[120px] truncate text-left text-sm font-medium sm:block">
              {username ?? 'Usuario'}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent
            className="min-w-[220px] rounded-lg border border-[var(--color-border)] bg-[var(--color-popover)] p-2 shadow-lg"
            sideOffset={6}
            align="end"
          >
            <div className="px-2 py-2">
              <p className="text-sm font-semibold text-[var(--color-popover-foreground)]">
                {username ?? 'Usuario'}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                Sesión activa
              </p>
              {roles.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {roles.map((role) => (
                    <Badge key={role} variant="secondary" className="text-[10px]">
                      {role}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <DropdownMenuSeparator className="my-2 h-px bg-[var(--color-border)]" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-[var(--color-foreground)] outline-none hover:bg-[var(--color-muted)] focus:bg-[var(--color-muted)]"
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
