import { Link, Outlet } from '@tanstack/react-router';
import { type ReactNode, useState, useCallback, useEffect } from 'react';
import { Bell, PackagePlus, UserPlus, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { GlobalCommandPalette } from '@/components/GlobalCommandPalette';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { getSearchShortcutLabel } from '@/lib/shortcut';
import { useAuthStore } from '@/stores/authStore';

const ACCESS_REGISTER_INVITE_KEY = 'ecubox_access_register_invite_dismissed';

function readAccessInviteDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(ACCESS_REGISTER_INVITE_KEY) === '1';
  } catch {
    return false;
  }
}

export function MainLayout({ content }: { content?: ReactNode }) {
  const [openCommand, setOpenCommand] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [accessInviteDismissed, setAccessInviteDismissed] = useState(readAccessInviteDismissed);
  const token = useAuthStore((s) => s.token);
  const isAcceso = useAuthStore((s) => s.isAcceso);
  const refreshAuth = useAuthStore((s) => s.refreshAuth);
  // Lazy initializer: en Mac evita el flash 'Ctrl+K' -> '⌘K' que ocurría
  // porque el valor se calculaba en un useEffect tras el primer render.
  const [shortcutLabel] = useState<string>(() => getSearchShortcutLabel());

  const openSearch = useCallback(() => {
    setOpenCommand(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpenCommand((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!token || isAcceso) return;
    void refreshAuth().catch(() => {
      // Si el perfil no refresca, dejamos la sesion actual intacta.
    });
  }, [isAcceso, refreshAuth, token]);

  return (
    <div className="flex h-dvh min-h-0 overflow-hidden bg-[var(--color-background)]">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          onOpenSearch={openSearch}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          shortcutLabel={shortcutLabel}
        />
        <main className="mobile-safe-inline min-h-0 flex-1 overflow-y-auto px-0 py-6 lg:py-10">
          <div className="page-shell">
            {isAcceso && !accessInviteDismissed ? (
              <AccessRegisterInvite
                onDismiss={() => {
                  setAccessInviteDismissed(true);
                  try {
                    window.localStorage.setItem(ACCESS_REGISTER_INVITE_KEY, '1');
                  } catch {
                    // Silent fallback if storage is blocked.
                  }
                }}
              />
            ) : null}
            {content ?? <Outlet />}
          </div>
        </main>
      </div>
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[86vw] max-w-[320px] p-0 sm:max-w-[320px] lg:hidden"
        >
          <SheetTitle className="sr-only">Navegación principal</SheetTitle>
          <Sidebar mobile onNavigate={() => setMobileSidebarOpen(false)} />
        </SheetContent>
      </Sheet>
      <GlobalCommandPalette open={openCommand} onOpenChange={setOpenCommand} />
    </div>
  );
}

function AccessRegisterInvite({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section
      className="mb-5 overflow-hidden rounded-md border border-[color-mix(in_oklab,var(--color-primary)_28%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-primary)_7%,var(--color-card))]"
      aria-label="Invitación a crear cuenta ECUBOX"
    >
      <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[color-mix(in_oklab,var(--color-primary)_16%,transparent)] text-[var(--color-primary)]">
            <UserPlus className="h-5 w-5" strokeWidth={1.8} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Crea tu cuenta ECUBOX y conserva el control de tus envíos
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
              Este enlace te da acceso temporal. Al registrarte tendrás tu casillero,
              podrás anunciar guías, recibir avisos y consultar tu historial desde tu propia cuenta.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-background)] px-2 py-1">
                <PackagePlus className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                Registrar guías
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--color-background)] px-2 py-1">
                <Bell className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                Recibir notificaciones
              </span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 lg:self-start">
          <Button asChild size="sm" className="gap-1.5">
            <Link to="/registro">
              Crear cuenta
            </Link>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onDismiss}
            aria-label="Ocultar invitación"
            title="Ocultar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
}
