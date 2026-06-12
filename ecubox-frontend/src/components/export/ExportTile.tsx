import { ChevronDown, Loader2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/**
 * Tarjeta de acción de exportación con botón primario + menú de variantes.
 * Presentacional y sin dominio: la usan el panel de Rastreo y el de la
 * calculadora para mantener una UX idéntica (icono, título, subtítulo y un
 * dropdown de formatos).
 */
export function ExportTile({
  icon,
  title,
  subtitle,
  disabled,
  pending,
  menu,
  onPrimary,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  disabled?: boolean;
  pending?: boolean;
  menu: React.ReactNode;
  onPrimary: () => void;
}) {
  return (
    <div
      className={cn(
        'flex overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] shadow-sm transition-colors',
        disabled && 'opacity-55'
      )}
    >
      <button
        type="button"
        onClick={onPrimary}
        disabled={disabled || pending}
        className="inline-flex min-h-14 flex-1 items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--color-muted)]/40 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--color-foreground)]">{title}</span>
          <span className="block text-[11px] text-[var(--color-muted-foreground)]">{subtitle}</span>
        </span>
      </button>
      <div className="w-px bg-[var(--color-border)]" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={disabled || pending}
            className="inline-flex h-full w-10 shrink-0 items-center justify-center text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/40 hover:text-[var(--color-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
            aria-label={`Más opciones de ${title}`}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72">
          {menu}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
