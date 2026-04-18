import { useMemo, useState } from 'react';
import { AlertTriangle, Clock, Eye, TrendingUp } from 'lucide-react';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { KpiCard } from '@/components/KpiCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePaquetesVencidosOperario } from '@/hooks/usePaquetesOperario';
import type { Paquete } from '@/types/paquete';
import { DestinatarioCell, GuiaMasterPiezaCell } from './PaqueteCells';

export function PaquetesVencidosPage() {
  const { data: paquetes, isLoading, error } = usePaquetesVencidosOperario(true);
  const [search, setSearch] = useState('');

  const list = useMemo(() => {
    const raw = paquetes ?? [];
    if (!search.trim()) return raw;
    const q = search.trim().toLowerCase();
    return raw.filter(
      (p) =>
        p.numeroGuia?.toLowerCase().includes(q) ||
        (p.guiaMasterTrackingBase?.toLowerCase().includes(q) ?? false) ||
        (p.ref?.toLowerCase().includes(q) ?? false) ||
        (p.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.destinatarioTelefono?.toLowerCase().includes(q) ?? false) ||
        (p.estadoRastreoNombre?.toLowerCase().includes(q) ?? false)
    );
  }, [paquetes, search]);

  const stats = useMemo(() => {
    const items = paquetes ?? [];
    if (items.length === 0) {
      return { total: 0, promedio: 0, maximo: 0, criticos: 0 };
    }
    const atrasos = items.map((p) => p.diasAtrasoRetiro ?? 0);
    const total = items.length;
    const sum = atrasos.reduce((a, b) => a + b, 0);
    const maximo = atrasos.reduce((a, b) => Math.max(a, b), 0);
    const promedio = total > 0 ? Math.round(sum / total) : 0;
    const criticos = items.filter((p) => (p.diasAtrasoRetiro ?? 0) >= 15).length;
    return { total, promedio, maximo, criticos };
  }, [paquetes]);

  const allPaquetes = paquetes ?? [];

  return (
    <div className="page-stack">
      <ListToolbar
        title="Paquetes vencidos de retiro"
        searchPlaceholder="Buscar por guía, ref, destinatario o estado..."
        onSearchChange={setSearch}
      />

      {isLoading && <LoadingState text="Cargando paquetes vencidos..." variant="inline" />}
      {error && (
        <div className="ui-alert ui-alert-error">
          Error al cargar paquetes vencidos.
        </div>
      )}

      {allPaquetes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Total vencidos"
            value={stats.total}
            tone="danger"
          />
          <KpiCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Atraso máximo"
            value={`${stats.maximo}d`}
            tone="warning"
          />
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="Atraso promedio"
            value={`${stats.promedio}d`}
            tone="neutral"
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Críticos (≥15d)"
            value={stats.criticos}
            tone={stats.criticos > 0 ? 'danger' : 'neutral'}
          />
        </div>
      )}

      {allPaquetes.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Sin paquetes vencidos"
          description="No hay paquetes que hayan superado el plazo máximo de retiro."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Sin resultados"
          description="No se encontraron paquetes vencidos con ese criterio."
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {list.length} paquete{list.length === 1 ? '' : 's'}
            {list.length !== allPaquetes.length ? ` de ${allPaquetes.length}` : ''}
          </p>
          <ListTableShell>
            <Table className="min-w-[920px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[16rem]">Guía master / Pieza</TableHead>
                  <TableHead className="min-w-[16rem]">Destinatario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="min-w-[12rem]">Plazo</TableHead>
                  <TableHead>Atraso</TableHead>
                  <TableHead className="w-24 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[16rem] align-top">
                      <GuiaMasterPiezaCell paquete={p} />
                      {p.ref && (
                        <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                          {p.ref}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[20rem] align-top">
                      <DestinatarioCell paquete={p} />
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge tone="neutral">
                        {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="align-top">
                      <PlazoCell paquete={p} />
                    </TableCell>
                    <TableCell className="align-top">
                      <AtrasoBadge dias={p.diasAtrasoRetiro ?? 0} />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <a
                        href={`/tracking?numeroGuia=${encodeURIComponent(p.numeroGuia)}`}
                        aria-label="Ver tracking"
                        title="Ver tracking"
                        className="inline-flex items-center justify-center rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:bg-[var(--color-muted)] hover:text-foreground"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ListTableShell>
        </>
      )}
    </div>
  );
}

function PlazoCell({ paquete: p }: { paquete: Paquete }) {
  const transcurridos = p.diasTranscurridos ?? null;
  const max = p.diasMaxRetiro ?? null;

  if (transcurridos == null && max == null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const ratio = max != null && max > 0 && transcurridos != null ? transcurridos / max : null;
  const pct = ratio != null ? Math.min(100, Math.round(ratio * 100)) : null;
  const overflow = ratio != null && ratio > 1;

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline gap-1 text-sm">
        <span className="font-medium text-foreground">{transcurridos ?? '—'}</span>
        <span className="text-xs text-muted-foreground">/ {max ?? '—'} días</span>
      </div>
      {pct != null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-muted)]">
          <div
            className={`h-full rounded-full ${
              overflow
                ? 'bg-[var(--color-destructive)]'
                : 'bg-[var(--color-warning)]'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function AtrasoBadge({ dias }: { dias: number }) {
  const severity: 'critical' | 'high' | 'normal' =
    dias >= 15 ? 'critical' : dias >= 7 ? 'high' : 'normal';

  if (severity === 'critical') {
    return (
      <StatusBadge tone="error" solid>
        <AlertTriangle className="h-3 w-3" />
        {dias} día{dias === 1 ? '' : 's'}
      </StatusBadge>
    );
  }
  if (severity === 'high') {
    return (
      <StatusBadge tone="warning" solid>
        <AlertTriangle className="h-3 w-3" />
        {dias} día{dias === 1 ? '' : 's'}
      </StatusBadge>
    );
  }
  return (
    <StatusBadge tone="error">
      <AlertTriangle className="h-3 w-3" />
      {dias} día{dias === 1 ? '' : 's'}
    </StatusBadge>
  );
}
