import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useMarcarNotificacionLeida,
  useMarcarTodasNotificacionesLeidas,
  useNotificaciones,
  useNotificacionesNoLeidas,
} from '@/hooks/useNotificaciones';
import { useActivarNotificaciones } from '@/hooks/useWebPush';
import type { NotificacionUsuario } from '@/types/notificacion';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function NotificationBell() {
  const { data: notifications = [], isLoading } = useNotificaciones(10);
  const { data: unread } = useNotificacionesNoLeidas();
  const markRead = useMarcarNotificacionLeida();
  const markAllRead = useMarcarTodasNotificacionesLeidas();
  const notificaciones = useActivarNotificaciones();
  const unreadCount = unread?.count ?? notifications.filter((item) => !item.leida).length;

  async function handleOpenNotification(notification: NotificacionUsuario) {
    if (!notification.leida) {
      await markRead.mutateAsync(notification.id);
    }
    if (notification.url) {
      window.location.href = notification.url;
    }
  }

  function handleRequestPermission(event: Event) {
    event.preventDefault();
    notificaciones.activate();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="dashboard-topbar-action relative h-8 w-8 shrink-0 rounded-md"
          aria-label="Notificaciones"
          title="Notificaciones"
        >
          <Bell className="h-4 w-4" strokeWidth={1.75} />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex min-w-3.5 items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[9px] font-bold leading-3 text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[min(92vw,360px)] rounded-md border border-[var(--color-border)] bg-[var(--color-popover)] p-1.5 shadow-none"
        sideOffset={8}
        align="end"
      >
        <div className="flex items-center justify-between gap-2 px-2 py-2">
          <div>
            <p className="text-[13px] font-semibold text-[var(--color-popover-foreground)]">
              Notificaciones
            </p>
            <p className="text-[11px] text-[var(--color-muted-foreground)]">
              Cambios de estado de tus paquetes
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-md px-2 text-[11px]"
              onClick={(event) => {
                event.preventDefault();
                markAllRead.mutate();
              }}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Leer
            </Button>
          )}
        </div>
        <DropdownMenuSeparator className="my-1 h-px bg-[var(--color-border)]" />

        {isLoading ? (
          <div className="flex items-center gap-2 px-2 py-4 text-[12px] text-[var(--color-muted-foreground)]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Cargando notificaciones...
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-2 py-5 text-center text-[12px] text-[var(--color-muted-foreground)]">
            No tienes notificaciones recientes.
          </div>
        ) : (
          <div className="max-h-[360px] space-y-1 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="block cursor-pointer rounded-md px-2 py-2 outline-none hover:bg-[var(--color-muted)] focus:bg-[var(--color-muted)]"
                onSelect={(event) => {
                  event.preventDefault();
                  void handleOpenNotification(notification);
                }}
              >
                <div className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                      notification.leida ? 'bg-[var(--color-border)]' : 'bg-[var(--color-primary)]'
                    }`}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-[12px] font-semibold text-[var(--color-popover-foreground)]">
                      {notification.titulo}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
                      {notification.mensaje}
                    </p>
                    <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">
                      {formatDate(notification.createdAt)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        )}

        <DropdownMenuSeparator className="my-1 h-px bg-[var(--color-border)]" />
        {notificaciones.isSupported && (
          <DropdownMenuItem
            className="flex cursor-pointer items-center justify-center rounded-md px-2 py-1.5 text-[12px] text-[var(--color-primary)] outline-none hover:bg-[var(--color-muted)] focus:bg-[var(--color-muted)] disabled:cursor-default disabled:text-[var(--color-muted-foreground)]"
            onSelect={handleRequestPermission}
            disabled={notificaciones.isPending || notificaciones.isGranted}
          >
            {notificaciones.isGranted
              ? 'Notificaciones activas'
              : notificaciones.isPending
                ? 'Activando...'
                : 'Activar push del navegador'}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
