import { AlertTriangle, Check, Eye, EyeOff, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SurfaceCard } from '@/components/ui/surface-card';
import { MonoTrunc } from '@/components/MonoTrunc';
import { PiezasProgress } from '@/components/PiezasProgress';
import { RowActionsMenu, type RowActionEntry } from '@/components/RowActionsMenu';
import { cn } from '@/lib/utils';
import type { GuiaMaster } from '@/types/guia-master';
import { GuiaMasterEstadoBadge } from './_estado';
import { parsearMotivoRevision } from './revisionMotivos';

/** Frena la propagación para que los controles internos no disparen el click de la tarjeta. */
function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/** Props comunes para hacer la tarjeta clicable (abre el detalle) y accesible por teclado. */
function cardClickProps(onAbrir: () => void, label: string) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': label,
    onClick: onAbrir,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onAbrir();
      }
    },
  };
}

/** Antigüedad relativa legible (es-EC) a partir de una fecha ISO. */
export function antiguedad(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (abs < 60) return rtf.format(diffSec, 'second');
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, 'minute');
  const hr = Math.round(min / 60);
  if (Math.abs(hr) < 24) return rtf.format(hr, 'hour');
  const day = Math.round(hr / 24);
  if (Math.abs(day) < 30) return rtf.format(day, 'day');
  const month = Math.round(day / 30);
  if (Math.abs(month) < 12) return rtf.format(month, 'month');
  return rtf.format(Math.round(month / 12), 'year');
}

function fmtFechaCorta(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ClienteConsignatario({ guia }: { guia: GuiaMaster }) {
  return (
    <div className="min-w-0 text-xs">
      <p className="truncate text-foreground" title={guia.consignatarioNombre ?? undefined}>
        {guia.consignatarioNombre ?? 'Sin asignar'}
      </p>
      {guia.clienteUsuarioNombre && (
        <p className="truncate text-muted-foreground" title={guia.clienteUsuarioNombre}>
          {guia.clienteUsuarioNombre}
        </p>
      )}
    </div>
  );
}

function Paquetes({ guia }: { guia: GuiaMaster }) {
  return (
    <PiezasProgress
      total={guia.totalPiezasEsperadas}
      registradas={guia.piezasRegistradas ?? 0}
      recibidas={guia.piezasRecibidas ?? 0}
      despachadas={guia.piezasDespachadas ?? 0}
      size="sm"
    />
  );
}

interface PendienteCardProps {
  guia: GuiaMaster;
  hasUpdate: boolean;
  onAbrir: () => void;
  onAprobar: () => void;
  onEditar: () => void;
}

/** Tarjeta móvil para la bandeja "Pendientes de aprobación". */
export function PendienteCard({ guia, hasUpdate, onAbrir, onAprobar, onEditar }: PendienteCardProps) {
  const registradas = guia.piezasRegistradas ?? 0;
  const inconsistente = registradas > 0;
  const items: RowActionEntry[] = [
    { label: 'Ver piezas', icon: Eye, onSelect: onAbrir },
    { label: 'Editar guía', icon: Pencil, onSelect: onEditar, hidden: !hasUpdate },
  ];
  return (
    <SurfaceCard
      {...cardClickProps(onAbrir, `Guía ${guia.trackingBase}`)}
      className={cn('cursor-pointer p-3', inconsistente && 'border-[var(--color-warning)]')}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span onClick={stop} className="inline-block max-w-full">
            <MonoTrunc value={guia.trackingBase} className="block font-medium text-foreground" />
          </span>
          <div className="mt-1">
            <GuiaMasterEstadoBadge estado={guia.estadoGlobal} />
          </div>
        </div>
        <div onClick={stop}>
          <RowActionsMenu items={items} ariaLabel="Más acciones de la guía pendiente" />
        </div>
      </div>

      {inconsistente ? (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
          <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
          Requiere revisión · {registradas} paquete{registradas === 1 ? '' : 's'} ya registrado
          {registradas === 1 ? '' : 's'}
        </p>
      ) : (
        <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <Check className="h-3 w-3 shrink-0 text-[var(--color-success)]" aria-hidden />
          Lista para aprobar
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <ClienteConsignatario guia={guia} />
        <div className="justify-self-end"><Paquetes guia={guia} /></div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-2">
        <span className="text-[11px] text-muted-foreground">Registrada {fmtFechaCorta(guia.createdAt)}</span>
        {hasUpdate && (
          <div onClick={stop}>
            <Button size="sm" onClick={onAprobar}>
              <Check className="mr-1.5 h-4 w-4" />
              Aprobar
            </Button>
          </div>
        )}
      </div>
    </SurfaceCard>
  );
}

interface RevisionCardProps {
  guia: GuiaMaster;
  hasUpdate: boolean;
  onAbrir: () => void;
  onAprobar: () => void;
  onSalirRevision: () => void;
}

/** Tarjeta móvil para la bandeja "En revisión". */
export function RevisionCard({ guia, hasUpdate, onAbrir, onAprobar, onSalirRevision }: RevisionCardProps) {
  const motivo = parsearMotivoRevision(guia.revisionMotivo);
  const items: RowActionEntry[] = [
    { label: 'Revisar', icon: Eye, onSelect: onAbrir },
    { label: 'Aprobar', icon: Check, onSelect: onAprobar, hidden: !hasUpdate },
    { label: 'Salir de revisión', icon: EyeOff, onSelect: onSalirRevision, hidden: !hasUpdate },
  ];
  return (
    <SurfaceCard {...cardClickProps(onAbrir, `Guía ${guia.trackingBase}`)} className="cursor-pointer p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span onClick={stop} className="inline-block max-w-full">
            <MonoTrunc value={guia.trackingBase} className="block font-medium text-foreground" />
          </span>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            En revisión {antiguedad(guia.revisionEn)}
          </p>
        </div>
        <div onClick={stop}>
          <RowActionsMenu items={items} ariaLabel="Más acciones de la guía en revisión" />
        </div>
      </div>

      <div className="mt-2">
        <Badge variant="outline" className="max-w-full whitespace-normal text-left text-[11px] font-normal">
          {motivo.label || 'Sin motivo registrado'}
        </Badge>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 border-t border-border pt-3">
        <ClienteConsignatario guia={guia} />
        <div className="justify-self-end"><Paquetes guia={guia} /></div>
      </div>
    </SurfaceCard>
  );
}
