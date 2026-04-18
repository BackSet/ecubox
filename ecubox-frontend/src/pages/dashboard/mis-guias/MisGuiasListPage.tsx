import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Boxes, Check, Copy, Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { ListTableShell } from '@/components/ListTableShell';
import { ListToolbar } from '@/components/ListToolbar';
import { LoadingState } from '@/components/LoadingState';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useEliminarMiGuia, useMisGuias } from '@/hooks/useMisGuias';
import { GuiaMasterEstadoBadge } from '@/pages/dashboard/guias-master/_estado';
import { DestinatarioInfo } from '@/pages/dashboard/paquetes/PaqueteCells';
import type { GuiaMaster } from '@/types/guia-master';
import { EditarMiGuiaDialog } from './EditarMiGuiaDialog';
import { RegistrarMiGuiaDialog } from './RegistrarMiGuiaDialog';

/** Solo se permite editar/eliminar mientras la guía esté en este estado. */
const ESTADO_EDITABLE = 'INCOMPLETA' as const;

export function MisGuiasListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [registrarOpen, setRegistrarOpen] = useState(false);
  const [editingGuia, setEditingGuia] = useState<GuiaMaster | null>(null);
  const [deletingGuia, setDeletingGuia] = useState<GuiaMaster | null>(null);
  const { data: guias = [], isLoading, error } = useMisGuias();
  const eliminar = useEliminarMiGuia();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return guias;
    return guias.filter(
      (g) =>
        g.trackingBase.toLowerCase().includes(q) ||
        (g.destinatarioNombre ?? '').toLowerCase().includes(q),
    );
  }, [guias, search]);

  return (
    <div className="space-y-4">
      <ListToolbar
        title="Mis guías"
        searchPlaceholder="Buscar por número de guía o destinatario..."
        onSearchChange={setSearch}
        actions={
          <Button className="w-full sm:w-auto" onClick={() => setRegistrarOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar guía
          </Button>
        }
      />

      {isLoading ? (
        <LoadingState text="Cargando tus guías..." />
      ) : error ? (
        <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
          No se pudieron cargar tus guías.
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={guias.length === 0 ? 'Aún no has registrado guías' : 'Sin resultados'}
          description={
            guias.length === 0
              ? 'Registra el número de guía que envías desde EE.UU. y asígnale un destinatario para hacer seguimiento.'
              : 'Prueba con otro término de búsqueda.'
          }
          action={
            guias.length === 0 ? (
              <Button onClick={() => setRegistrarOpen(true)}>Registrar guía</Button>
            ) : undefined
          }
        />
      ) : (
        <ListTableShell>
          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[18rem]">Guía</TableHead>
                <TableHead className="w-[20rem]">Destinatario</TableHead>
                <TableHead className="min-w-[12rem]">Piezas</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Registrada</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((g) => {
                const totalPendiente = g.totalPiezasEsperadas == null;
                const editable = g.estadoGlobal === ESTADO_EDITABLE;
                const tooltipNoEditable = `No editable: la guía está en estado ${g.estadoGlobal}`;
                return (
                  <TableRow
                    key={g.id}
                    className={`cursor-pointer ${
                      totalPendiente ? 'bg-amber-50/40 dark:bg-amber-900/10' : ''
                    }`}
                    onClick={() =>
                      navigate({
                        to: '/mis-guias/$id',
                        params: { id: String(g.id) },
                      })
                    }
                  >
                    <TableCell className="max-w-[18rem] align-top">
                      <GuiaCell guia={g} />
                    </TableCell>
                    <TableCell className="max-w-[20rem] align-top">
                      <DestinatarioInfo
                        nombre={g.destinatarioNombre}
                        telefono={g.destinatarioTelefono}
                        direccion={g.destinatarioDireccion}
                        provincia={g.destinatarioProvincia}
                        canton={g.destinatarioCanton}
                        emptyLabel="Sin asignar"
                        emptyItalic
                      />
                    </TableCell>
                    <TableCell className="align-top">
                      <PiezasMiniProgress guia={g} />
                    </TableCell>
                    <TableCell className="align-top">
                      <GuiaMasterEstadoBadge estado={g.estadoGlobal} />
                    </TableCell>
                    <TableCell className="align-top text-xs text-muted-foreground">
                      <FechaCreada createdAt={g.createdAt} />
                    </TableCell>
                    <TableCell
                      className="text-right align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Ver piezas"
                          title="Ver piezas"
                          onClick={() =>
                            navigate({
                              to: '/mis-guias/$id',
                              params: { id: String(g.id) },
                            })
                          }
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Editar guía"
                          title={editable ? 'Editar guía' : tooltipNoEditable}
                          disabled={!editable}
                          onClick={() => editable && setEditingGuia(g)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Eliminar guía"
                          title={editable ? 'Eliminar guía' : tooltipNoEditable}
                          disabled={!editable}
                          className={
                            editable
                              ? 'text-[var(--color-destructive)] hover:text-[var(--color-destructive)]'
                              : ''
                          }
                          onClick={() => editable && setDeletingGuia(g)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {registrarOpen && (
        <RegistrarMiGuiaDialog onClose={() => setRegistrarOpen(false)} />
      )}

      {editingGuia && (
        <EditarMiGuiaDialog
          guia={editingGuia}
          open
          onClose={() => setEditingGuia(null)}
        />
      )}

      <ConfirmDialog
        open={deletingGuia != null}
        onOpenChange={(open) => !open && !eliminar.isPending && setDeletingGuia(null)}
        title="¿Eliminar guía?"
        description={
          deletingGuia
            ? `Se eliminará la guía "${deletingGuia.trackingBase}". Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        variant="destructive"
        loading={eliminar.isPending}
        onConfirm={async () => {
          if (!deletingGuia) return;
          try {
            await eliminar.mutateAsync(deletingGuia.id);
            toast.success('Guía eliminada');
            setDeletingGuia(null);
          } catch (err: unknown) {
            const res = (err as { response?: { data?: { message?: string } } })?.response;
            toast.error(res?.data?.message ?? 'No se pudo eliminar la guía');
            throw err;
          }
        }}
      />
    </div>
  );
}

function GuiaCell({ guia }: { guia: GuiaMaster }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(guia.trackingBase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  return (
    <div className="flex min-w-0 items-start gap-1">
      <span
        className="min-w-0 break-all font-mono text-sm font-medium text-foreground"
        title={guia.trackingBase}
      >
        {guia.trackingBase}
      </span>
      <button
        type="button"
        onClick={handleCopy}
        aria-label="Copiar guía"
        title="Copiar guía"
        className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-[var(--color-muted)] hover:text-foreground hover:opacity-100"
      >
        {copied ? (
          <Check className="h-3 w-3 text-[var(--color-success)]" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}

function PiezasMiniProgress({ guia: g }: { guia: GuiaMaster }) {
  const total = g.totalPiezasEsperadas;
  const registradas = g.piezasRegistradas ?? 0;
  const recibidas = g.piezasRecibidas ?? 0;
  const despachadas = g.piezasDespachadas ?? 0;

  if (total == null) {
    return (
      <div className="space-y-1">
        <Badge variant="outline" className="border-amber-400 text-amber-700">
          Total pendiente
        </Badge>
        <p className="text-[11px] text-muted-foreground">
          {registradas} registrada{registradas === 1 ? '' : 's'}
          {recibidas > 0 ? ` · ${recibidas} recibida${recibidas === 1 ? '' : 's'}` : ''}
          {despachadas > 0
            ? ` · ${despachadas} despachada${despachadas === 1 ? '' : 's'}`
            : ''}
        </p>
      </div>
    );
  }

  const safeTotal = Math.max(total, 1);
  const pctRegistradas = Math.min(100, (registradas / safeTotal) * 100);
  const pctRecibidas = Math.min(100, (recibidas / safeTotal) * 100);
  const pctDespachadas = Math.min(100, (despachadas / safeTotal) * 100);

  return (
    <div className="min-w-[10rem] space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">
          {registradas} / {total}
        </span>
        <span className="text-muted-foreground">piezas</span>
      </div>
      <div className="relative h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]">
        <div
          className="absolute inset-y-0 left-0 bg-blue-500/70"
          style={{ width: `${pctRegistradas}%` }}
          title={`Registradas: ${registradas}/${total}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-amber-500/80"
          style={{ width: `${pctRecibidas}%` }}
          title={`Recibidas: ${recibidas}/${total}`}
        />
        <div
          className="absolute inset-y-0 left-0 bg-emerald-500/80"
          style={{ width: `${pctDespachadas}%` }}
          title={`Despachadas: ${despachadas}/${total}`}
        />
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
        <Dot color="bg-blue-500" label={`Reg ${registradas}`} />
        <Dot color="bg-amber-500" label={`Rec ${recibidas}`} />
        <Dot color="bg-emerald-500" label={`Desp ${despachadas}`} />
      </div>
    </div>
  );
}

function Dot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} aria-hidden />
      {label}
    </span>
  );
}

function FechaCreada({ createdAt }: { createdAt?: string }) {
  if (!createdAt) return <>—</>;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return <>—</>;
  const absolute = date.toLocaleString();
  const short = date.toLocaleDateString();
  const rel = relativeTime(date);
  return (
    <div className="flex flex-col leading-tight" title={absolute}>
      <span>{short}</span>
      {rel && <span className="text-[11px] opacity-70">{rel}</span>}
    </div>
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
