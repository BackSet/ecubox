import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  Boxes,
  CalendarClock,
  Eye,
  FileText,
  PackageCheck,
  Plus,
  Trash2,
  UserCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteLoteRecepcion, useLotesRecepcion } from '@/hooks/useLotesRecepcion';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ListTableShell } from '@/components/ListTableShell';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { KpiCard } from '@/components/KpiCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type { LoteRecepcion } from '@/types/lote-recepcion';

export function LoteRecepcionListPage() {
  const navigate = useNavigate();
  const { data: lotes, isLoading, error } = useLotesRecepcion();
  const deleteLote = useDeleteLoteRecepcion();
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const list = useMemo(() => {
    const raw = lotes ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (l) =>
        String(l.id).includes(q) ||
        l.observaciones?.toLowerCase().includes(q) ||
        l.operarioNombre?.toLowerCase().includes(q) ||
        l.numeroGuiasEnvio?.some((g) => g.toLowerCase().includes(q)),
    );
  }, [lotes, search]);

  const stats = useMemo(() => {
    const all = lotes ?? [];
    if (all.length === 0) {
      return { total: 0, paquetes: 0, hoy: 0, guiasUnicas: 0 };
    }
    const guias = new Set<string>();
    let paquetes = 0;
    let hoy = 0;
    const ahora = new Date();
    const hoyStr = `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}`;
    for (const l of all) {
      paquetes += l.totalPaquetes ?? 0;
      l.numeroGuiasEnvio?.forEach((g) => guias.add(g));
      if (l.fechaRecepcion) {
        const d = new Date(l.fechaRecepcion);
        if (!Number.isNaN(d.getTime())) {
          const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
          if (dStr === hoyStr) hoy += 1;
        }
      }
    }
    return { total: all.length, paquetes, hoy, guiasUnicas: guias.size };
  }, [lotes]);

  if (isLoading) {
    return <LoadingState text="Cargando lotes de recepción..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar lotes de recepción.
      </div>
    );
  }

  const allLotes = lotes ?? [];

  return (
    <div className="page-stack">
      <ListToolbar
        title="Lotes de recepción"
        searchPlaceholder="Buscar por #, observaciones, operario o guía..."
        onSearchChange={setSearch}
        actions={
          <Link to="/lotes-recepcion/nuevo">
            <Button className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Registrar nuevo lote
            </Button>
          </Link>
        }
      />

      {allLotes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<PackageCheck className="h-5 w-5" />}
            label="Lotes registrados"
            value={stats.total}
            tone="primary"
          />
          <KpiCard
            icon={<Boxes className="h-5 w-5" />}
            label="Paquetes recibidos"
            value={stats.paquetes}
            tone="success"
          />
          <KpiCard
            icon={<FileText className="h-5 w-5" />}
            label="Guías únicas"
            value={stats.guiasUnicas}
            tone="neutral"
          />
          <KpiCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Lotes hoy"
            value={stats.hoy}
            tone={stats.hoy > 0 ? 'warning' : 'neutral'}
          />
        </div>
      )}

      {allLotes.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="No hay lotes de recepción"
          description='Registra un lote desde el botón "Registrar nuevo lote". Solo se incluirán las guías que tengan paquetes en el sistema.'
          action={
            <Link to="/lotes-recepcion/nuevo">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Registrar nuevo lote
              </Button>
            </Link>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={PackageCheck}
          title="Sin resultados"
          description="No hay lotes que coincidan con la búsqueda."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {list.length} lote{list.length === 1 ? '' : 's'}
            {list.length !== allLotes.length ? ` de ${allLotes.length}` : ''}
          </p>
          <ListTableShell>
            <Table className="min-w-[820px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14rem]">Recepción</TableHead>
                  <TableHead className="min-w-[14rem]">Operario</TableHead>
                  <TableHead>Guías</TableHead>
                  <TableHead>Paquetes</TableHead>
                  <TableHead className="min-w-[14rem]">Observaciones</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((l) => (
                  <TableRow
                    key={l.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: '/lotes-recepcion/$id',
                        params: { id: String(l.id) },
                      })
                    }
                  >
                    <TableCell className="align-top">
                      <RecepcionCell lote={l} />
                    </TableCell>
                    <TableCell className="align-top">
                      <OperarioCell nombre={l.operarioNombre} />
                    </TableCell>
                    <TableCell className="align-top">
                      <GuiasCount total={l.numeroGuiasEnvio?.length ?? 0} />
                    </TableCell>
                    <TableCell className="align-top">
                      <PaquetesBadge total={l.totalPaquetes ?? 0} />
                    </TableCell>
                    <TableCell className="max-w-[18rem] align-top">
                      <ObservacionesCell texto={l.observaciones} />
                    </TableCell>
                    <TableCell
                      className="text-right align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to="/lotes-recepcion/$id"
                          params={{ id: String(l.id) }}
                          aria-label="Ver detalle"
                          title="Ver detalle"
                          className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(l.id)}
                          aria-label="Eliminar lote"
                          title="Eliminar lote"
                          className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)] hover:border-[var(--color-destructive)]/40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>
        </>
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar lote de recepción?"
        description="Se eliminará el lote y se revertirá el estado de los paquetes asociados cuando aplique. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteLote.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            const result = await deleteLote.mutateAsync(deleteConfirmId);
            const reverted = result.paquetesRevertidos ?? 0;
            toast.success(
              reverted > 0
                ? `Lote eliminado. ${reverted} paquete${reverted === 1 ? '' : 's'} volvieron al estado anterior.`
                : 'Lote eliminado correctamente',
            );
          } catch (err: unknown) {
            toast.error(getApiErrorMessage(err) ?? 'Error al eliminar el lote');
            throw err;
          }
        }}
      />
    </div>
  );
}

function RecepcionCell({ lote }: { lote: LoteRecepcion }) {
  const d = lote.fechaRecepcion ? new Date(lote.fechaRecepcion) : null;
  const valido = d && !Number.isNaN(d.getTime());
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="text-xs font-mono text-muted-foreground">#{lote.id}</span>
      {valido ? (
        <>
          <span className="text-sm font-medium text-foreground">
            {d!.toLocaleDateString('es-EC', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {d!.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
            {' · '}
            {relativeTime(d!) ?? ''}
          </span>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

function OperarioCell({ nombre }: { nombre?: string | null }) {
  if (!nombre) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <UserCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate" title={nombre}>
        {nombre}
      </span>
    </div>
  );
}

function GuiasCount({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge
        className={
          total > 0
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'bg-[var(--color-muted)] text-muted-foreground hover:bg-[var(--color-muted)]'
        }
      >
        {total}
      </Badge>
      <span className="text-xs text-muted-foreground">
        guía{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function PaquetesBadge({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge
        className={
          total > 0
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'bg-[var(--color-muted)] text-muted-foreground hover:bg-[var(--color-muted)]'
        }
      >
        {total}
      </Badge>
      <span className="text-xs text-muted-foreground">
        paquete{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}

function ObservacionesCell({ texto }: { texto?: string | null }) {
  const t = texto?.trim();
  if (!t) {
    return <span className="text-xs italic text-muted-foreground">Sin observaciones</span>;
  }
  return (
    <p
      className="line-clamp-2 break-words text-sm text-muted-foreground"
      title={t}
    >
      {t}
    </p>
  );
}

function relativeTime(date: Date): string | null {
  const diffMs = date.getTime() - Date.now();
  const diffSec = Math.round(diffMs / 1000);
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
  const year = Math.round(month / 12);
  return rtf.format(year, 'year');
}
