import { useCallback, useMemo, useState } from 'react';
import { Ban, Eye, EyeOff, RefreshCw, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { MonoTrunc } from '@/components/MonoTrunc';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useCancelarGuiaMaster,
  useGuiasMasterPaginadas,
  useMarcarGuiaMasterEnRevision,
  useRecalcularGuiaMaster,
  useSalirGuiaMasterDeRevision,
} from '@/hooks/useGuiasMaster';
import {
  GuiaMasterEstadoBadge,
  GUIA_MASTER_ESTADOS_CONGELADOS,
  GUIA_MASTER_ESTADOS_TERMINALES,
} from '@/pages/dashboard/guias-master/_estado';

type AccionGuia = 'cancelar' | 'revision' | 'salir' | 'recalcular';

async function runBulk(ids: number[], fn: (id: number) => Promise<unknown>) {
  const res = await Promise.allSettled(ids.map((id) => fn(id)));
  const ok = res.filter((r) => r.status === 'fulfilled').length;
  return { ok, fail: ids.length - ok };
}

export function GestionarEstadosGuiasTab() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [motivoDialog, setMotivoDialog] = useState<AccionGuia | null>(null);
  const [motivo, setMotivo] = useState('');

  const { data, isLoading } = useGuiasMasterPaginadas({ q: q.trim() || undefined, page, size });
  const cancelar = useCancelarGuiaMaster();
  const marcarRevision = useMarcarGuiaMasterEnRevision();
  const salirRevision = useSalirGuiaMasterDeRevision();
  const recalcular = useRecalcularGuiaMaster();

  const guias = useMemo(() => data?.content ?? [], [data]);
  const seleccionadas = useMemo(() => guias.filter((g) => selected.has(g.id)), [guias, selected]);

  const eleg = useMemo(() => {
    if (seleccionadas.length === 0) {
      return { cancelar: false, revision: false, salir: false, recalcular: false };
    }
    return {
      cancelar: seleccionadas.every((g) => !GUIA_MASTER_ESTADOS_TERMINALES.has(g.estadoGlobal)),
      revision: seleccionadas.every(
        (g) => !GUIA_MASTER_ESTADOS_TERMINALES.has(g.estadoGlobal) && g.estadoGlobal !== 'EN_REVISION',
      ),
      salir: seleccionadas.every((g) => g.estadoGlobal === 'EN_REVISION'),
      recalcular: seleccionadas.every((g) => !GUIA_MASTER_ESTADOS_CONGELADOS.has(g.estadoGlobal)),
    };
  }, [seleccionadas]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allVisiblesSelected = guias.length > 0 && guias.every((g) => selected.has(g.id));
  const someVisiblesSelected = guias.some((g) => selected.has(g.id));
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const all = guias.length > 0 && guias.every((g) => next.has(g.id));
      for (const g of guias) (all ? next.delete(g.id) : next.add(g.id));
      return next;
    });
  }, [guias]);

  const ejecutar = useCallback(
    async (accion: AccionGuia, motivoTexto: string) => {
      const ids = seleccionadas.map((g) => g.id);
      if (ids.length === 0) return;
      const fn =
        accion === 'cancelar'
          ? (id: number) => cancelar.mutateAsync({ id, body: { motivo: motivoTexto } })
          : accion === 'revision'
            ? (id: number) =>
                marcarRevision.mutateAsync({ id, body: motivoTexto ? { motivo: motivoTexto } : {} })
            : accion === 'salir'
              ? (id: number) =>
                  salirRevision.mutateAsync({ id, body: motivoTexto ? { motivo: motivoTexto } : {} })
              : (id: number) => recalcular.mutateAsync(id);
      const { ok, fail } = await runBulk(ids, fn);
      toast[fail === 0 ? 'success' : 'warning'](
        `${ok} guía${ok === 1 ? '' : 's'} actualizada${ok === 1 ? '' : 's'}` +
          (fail > 0 ? ` · ${fail} con error` : ''),
      );
      setSelected(new Set());
      setMotivoDialog(null);
      setMotivo('');
    },
    [seleccionadas, cancelar, marcarRevision, salirRevision, recalcular],
  );

  const pending =
    cancelar.isPending || marcarRevision.isPending || salirRevision.isPending || recalcular.isPending;

  const totalElements = data?.totalElements ?? guias.length;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4 pb-28">
      <ListToolbar
        title="Guías master"
        searchPlaceholder="Buscar por tracking base..."
        onSearchChange={(v) => {
          setQ(v);
          setPage(0);
        }}
      />

      {isLoading ? (
        <ListTableShell>
          <Table className="min-w-[640px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Tracking base</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Piezas (reg/rec/desp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton columns={4} />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : guias.length === 0 ? (
        <EmptyState icon={Tag} title="Sin guías" description="No hay guías master que coincidan." />
      ) : (
        <ListTableShell>
          <Table className="min-w-[640px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allVisiblesSelected ? true : someVisiblesSelected ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todas"
                  />
                </TableHead>
                <TableHead>Tracking base</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Piezas (reg/rec/desp)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {guias.map((g) => {
                const sel = selected.has(g.id);
                return (
                  <TableRow
                    key={g.id}
                    onClick={() => toggle(g.id)}
                    className={`cursor-pointer ${sel ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={sel} onCheckedChange={() => toggle(g.id)} aria-label={`Seleccionar ${g.trackingBase}`} />
                    </TableCell>
                    <TableCell>
                      <MonoTrunc value={g.trackingBase} head={8} tail={6} className="text-xs" />
                    </TableCell>
                    <TableCell>
                      <GuiaMasterEstadoBadge estado={g.estadoGlobal} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(g.piezasRegistradas ?? 0)}/{(g.piezasRecibidas ?? 0)}/{(g.piezasDespachadas ?? 0)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {!isLoading && guias.length > 0 && (
        <TablePagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={(s) => {
            setSize(s);
            setPage(0);
          }}
        />
      )}

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 px-4 pb-4">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-card/95 px-4 py-3 backdrop-blur">
            <Badge className="bg-primary text-primary-foreground hover:bg-primary">
              {selected.size} seleccionada{selected.size === 1 ? '' : 's'}
            </Badge>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!eleg.recalcular || pending}
                onClick={() => ejecutar('recalcular', '')}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" />
                Recalcular
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!eleg.revision || pending}
                onClick={() => setMotivoDialog('revision')}
              >
                <Eye className="mr-1.5 h-4 w-4" />
                Marcar en revisión
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!eleg.salir || pending}
                onClick={() => setMotivoDialog('salir')}
              >
                <EyeOff className="mr-1.5 h-4 w-4" />
                Salir de revisión
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={!eleg.cancelar || pending}
                onClick={() => setMotivoDialog('cancelar')}
              >
                <Ban className="mr-1.5 h-4 w-4" />
                Cancelar
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={pending}>
                <X className="mr-1 h-3.5 w-3.5" />
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog
        open={motivoDialog != null}
        onOpenChange={(o) => {
          if (!o && !pending) {
            setMotivoDialog(null);
            setMotivo('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {motivoDialog === 'cancelar'
                ? 'Cancelar guías'
                : motivoDialog === 'revision'
                  ? 'Marcar en revisión'
                  : 'Salir de revisión'}
            </DialogTitle>
            <DialogDescription>
              Se aplicará a {selected.size} guía{selected.size === 1 ? '' : 's'}.
              {motivoDialog === 'cancelar' ? ' El motivo es obligatorio.' : ' El motivo es opcional.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo…"
            rows={3}
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setMotivoDialog(null);
                setMotivo('');
              }}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              disabled={pending || (motivoDialog === 'cancelar' && motivo.trim() === '')}
              onClick={() => motivoDialog && ejecutar(motivoDialog, motivo.trim())}
            >
              Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
