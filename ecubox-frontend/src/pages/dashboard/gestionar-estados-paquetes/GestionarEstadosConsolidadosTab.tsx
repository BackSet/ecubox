import { useCallback, useMemo, useState } from 'react';
import { Plane, RotateCcw, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { TablePagination } from '@/components/ui/TablePagination';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MonoTrunc } from '@/components/MonoTrunc';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useEnviosConsolidados,
  useEnviarDesdeUsaEnvioConsolidado,
  useReabrirEnvioConsolidado,
} from '@/hooks/useEnviosConsolidados';
import {
  EnvioConsolidadoBadge,
  resolveEstadoOperativoConsolidado,
} from '@/pages/dashboard/envios-consolidados/EnvioConsolidadoBadge';

type AccionConsolidado = 'enviar' | 'reabrir';

const AYUDA_DERIVADOS: Record<string, string> = {
  VACIO: 'Agrega piezas al consolidado para poder enviarlo.',
  RECIBIDO_EN_BODEGA: 'Su estado se gestiona desde Lotes de recepción.',
  LIQUIDADO: 'Su estado se gestiona desde Liquidaciones (marcar como pagada).',
};

async function runBulk(ids: number[], fn: (id: number) => Promise<unknown>) {
  const res = await Promise.allSettled(ids.map((id) => fn(id)));
  const ok = res.filter((r) => r.status === 'fulfilled').length;
  return { ok, fail: ids.length - ok };
}

export function GestionarEstadosConsolidadosTab() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(25);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [confirm, setConfirm] = useState<AccionConsolidado | null>(null);

  const { data, isLoading } = useEnviosConsolidados({ q: q.trim() || undefined, page, size });
  const enviar = useEnviarDesdeUsaEnvioConsolidado();
  const reabrir = useReabrirEnvioConsolidado();

  const envios = useMemo(() => data?.content ?? [], [data]);
  const operativoPorId = useMemo(() => {
    const map = new Map<number, string>();
    for (const e of envios) map.set(e.id, resolveEstadoOperativoConsolidado(e));
    return map;
  }, [envios]);

  const seleccionados = useMemo(() => envios.filter((e) => selected.has(e.id)), [envios, selected]);

  const eleg = useMemo(() => {
    if (seleccionados.length === 0) return { enviar: false, reabrir: false };
    return {
      enviar: seleccionados.every((e) => operativoPorId.get(e.id) === 'EN_PREPARACION'),
      reabrir: seleccionados.every((e) => operativoPorId.get(e.id) === 'ENVIADO_DESDE_USA'),
    };
  }, [seleccionados, operativoPorId]);

  const ayudaSeleccion = useMemo(() => {
    if (eleg.enviar || eleg.reabrir || seleccionados.length === 0) return null;
    for (const e of seleccionados) {
      const op = operativoPorId.get(e.id) ?? '';
      if (AYUDA_DERIVADOS[op]) return AYUDA_DERIVADOS[op];
    }
    return 'La selección mezcla estados con distintas transiciones disponibles.';
  }, [eleg, seleccionados, operativoPorId]);

  const toggle = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSel = envios.length > 0 && envios.every((e) => selected.has(e.id));
  const someSel = envios.some((e) => selected.has(e.id));
  const toggleAll = useCallback(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      const all = envios.length > 0 && envios.every((e) => next.has(e.id));
      for (const e of envios) (all ? next.delete(e.id) : next.add(e.id));
      return next;
    });
  }, [envios]);

  const ejecutar = useCallback(
    async (accion: AccionConsolidado) => {
      const ids = seleccionados.map((e) => e.id);
      if (ids.length === 0) return;
      const fn =
        accion === 'enviar'
          ? (id: number) => enviar.mutateAsync(id)
          : (id: number) => reabrir.mutateAsync(id);
      const { ok, fail } = await runBulk(ids, fn);
      toast[fail === 0 ? 'success' : 'warning'](
        `${ok} consolidado${ok === 1 ? '' : 's'} actualizado${ok === 1 ? '' : 's'}` +
          (fail > 0 ? ` · ${fail} con error` : ''),
      );
      setSelected(new Set());
      setConfirm(null);
    },
    [seleccionados, enviar, reabrir],
  );

  const pending = enviar.isPending || reabrir.isPending;
  const totalElements = data?.totalElements ?? envios.length;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="space-y-4 pb-28">
      <ListToolbar
        title="Envíos consolidados"
        searchPlaceholder="Buscar por código..."
        onSearchChange={(v) => {
          setQ(v);
          setPage(0);
        }}
      />

      {isLoading ? (
        <ListTableShell>
          <Table className="min-w-[560px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Código</TableHead>
                <TableHead>Estado operativo</TableHead>
                <TableHead>Piezas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton columns={4} />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : envios.length === 0 ? (
        <EmptyState icon={Tag} title="Sin consolidados" description="No hay envíos consolidados que coincidan." />
      ) : (
        <ListTableShell>
          <Table className="min-w-[560px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSel ? true : someSel ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    aria-label="Seleccionar todos"
                  />
                </TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Estado operativo</TableHead>
                <TableHead>Piezas</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {envios.map((e) => {
                const sel = selected.has(e.id);
                return (
                  <TableRow
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    className={`cursor-pointer ${sel ? 'bg-primary/5 hover:bg-primary/10' : ''}`}
                  >
                    <TableCell onClick={(ev) => ev.stopPropagation()}>
                      <Checkbox checked={sel} onCheckedChange={() => toggle(e.id)} aria-label={`Seleccionar ${e.codigo}`} />
                    </TableCell>
                    <TableCell>
                      <MonoTrunc value={e.codigo} head={8} tail={6} className="text-xs" />
                    </TableCell>
                    <TableCell>
                      <EnvioConsolidadoBadge cerrado={e.cerrado} estadoOperativo={e.estadoOperativo} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{e.totalPaquetes}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ListTableShell>
      )}

      {!isLoading && envios.length > 0 && (
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
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-primary text-primary-foreground hover:bg-primary">
                {selected.size} seleccionado{selected.size === 1 ? '' : 's'}
              </Badge>
              {ayudaSeleccion && (
                <span className="text-xs text-muted-foreground">{ayudaSeleccion}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!eleg.enviar || pending}
                onClick={() => setConfirm('enviar')}
              >
                <Plane className="mr-1.5 h-4 w-4" />
                Enviar desde USA
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!eleg.reabrir || pending}
                onClick={() => setConfirm('reabrir')}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                Reabrir (En preparación)
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())} disabled={pending}>
                <X className="mr-1 h-3.5 w-3.5" />
                Limpiar
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirm != null}
        onOpenChange={(o) => !o && !pending && setConfirm(null)}
        title={confirm === 'enviar' ? '¿Enviar desde USA?' : '¿Reabrir consolidados?'}
        description={
          confirm === 'enviar'
            ? `Se marcarán ${selected.size} consolidado(s) como "Enviado desde USA".`
            : `Se reabrirán ${selected.size} consolidado(s) a "En preparación".`
        }
        confirmLabel="Aplicar"
        loading={pending}
        onConfirm={() => {
          if (confirm) void ejecutar(confirm);
        }}
      />
    </div>
  );
}
