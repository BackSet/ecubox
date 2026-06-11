import { useState, type ReactNode } from 'react';
import { HelpCircle, Loader2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { cn } from '@/lib/utils';

export interface EstadoLeyendaItem {
  key: string;
  label: string;
  descripcion?: string | null;
  tone: StatusTone;
  icon?: LucideIcon;
}

interface EstadosLeyendaDialogProps {
  /** Título del diálogo, p. ej. "¿Qué significa cada estado?". */
  title: string;
  /** Texto introductorio opcional bajo el título. */
  description?: ReactNode;
  items: EstadoLeyendaItem[];
  /** aria-label del botón "?" que abre el diálogo. */
  triggerLabel: string;
  isLoading?: boolean;
  className?: string;
}

/**
 * Botón de ayuda "?" que abre un diálogo con la leyenda completa de un
 * conjunto de estados (badge de color + nombre + explicación). Componente
 * genérico: todo el copy de dominio entra por props.
 */
export function EstadosLeyendaDialog({
  title,
  description,
  items,
  triggerLabel,
  isLoading = false,
  className,
}: EstadosLeyendaDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={triggerLabel}
          title={triggerLabel}
          className={cn('h-8 w-8 text-[var(--color-muted-foreground)]', className)}
        >
          <HelpCircle className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {isLoading ? (
          <div
            className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--color-muted-foreground)]"
            role="status"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Cargando estados...
          </div>
        ) : (
          <ul className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.key} className="space-y-1">
                  <StatusBadge
                    tone={item.tone}
                    icon={Icon ? <Icon className="h-3 w-3" /> : undefined}
                  >
                    {item.label}
                  </StatusBadge>
                  {item.descripcion ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {item.descripcion}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
