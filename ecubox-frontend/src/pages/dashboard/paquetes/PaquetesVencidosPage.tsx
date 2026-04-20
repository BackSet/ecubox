import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Clock, Eye, TrendingUp } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
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
import { ConsignatarioCell, GuiaMasterPiezaCell } from './PaqueteCells';

export function PaquetesVencidosPage() {
  const navigate = useNavigate();
  const { data: paquetes, isLoading, isFetching, error, refetch } = usePaquetesVencidosOperario(true);
  const [search, setSearch] = useState('');
  // Chip de gravedad: leve (<7d), alto (7-14d), critico (>=15d).
  const [chipActivo, setChipActivo] = useState<
    'todos' | 'leve' | 'alto' | 'critico'
  >('todos');
  const [consignatarioFiltro, setConsignatarioFiltro] = useState<string | undefined>(
    undefined,
  );
  const [estadoFiltro, setEstadoFiltro] = useState<string | undefined>(undefined);

  // Comboboxes alimentados con valores presentes en los datos.
  const consignatarios = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetes ?? []) {
      const n = p.consignatarioNombre?.trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }, [paquetes]);

  const estados = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of paquetes ?? []) {
      const key = p.estadoRastreoCodigo ?? p.estadoRastreoNombre;
      if (!key) continue;
      const label = p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? key;
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries())
      .map(([codigo, nombre]) => ({ codigo, nombre }))
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
      );
  }, [paquetes]);

  const baseList = useMemo(() => {
    const raw = paquetes ?? [];
    const q = search.trim().toLowerCase();
    return raw.filter((p) => {
      if (
        consignatarioFiltro &&
        (p.consignatarioNombre ?? '') !== consignatarioFiltro
      )
        return false;
      if (estadoFiltro) {
        const key = p.estadoRastreoCodigo ?? p.estadoRastreoNombre ?? '';
        if (key !== estadoFiltro) return false;
      }
      if (!q) return true;
      return (
        p.numeroGuia?.toLowerCase().includes(q) ||
        (p.guiaMasterTrackingBase?.toLowerCase().includes(q) ?? false) ||
        (p.ref?.toLowerCase().includes(q) ?? false) ||
        (p.consignatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.consignatarioTelefono?.toLowerCase().includes(q) ?? false) ||
        (p.estadoRastreoNombre?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [paquetes, search, consignatarioFiltro, estadoFiltro]);

  const chipCounts = useMemo(() => {
    let leve = 0;
    let alto = 0;
    let critico = 0;
    for (const p of baseList) {
      const d = p.diasAtrasoRetiro ?? 0;
      if (d >= 15) critico += 1;
      else if (d >= 7) alto += 1;
      else leve += 1;
    }
    return { todos: baseList.length, leve, alto, critico };
  }, [baseList]);

  const list = useMemo(() => {
    if (chipActivo === 'todos') return baseList;
    return baseList.filter((p) => {
      const d = p.diasAtrasoRetiro ?? 0;
      if (chipActivo === 'critico') return d >= 15;
      if (chipActivo === 'alto') return d >= 7 && d < 15;
      if (chipActivo === 'leve') return d < 7;
      return true;
    });
  }, [baseList, chipActivo]);

  const tieneFiltros =
    !!consignatarioFiltro || !!estadoFiltro || chipActivo !== 'todos';

  const limpiarFiltros = useCallback(() => {
    setConsignatarioFiltro(undefined);
    setEstadoFiltro(undefined);
    setChipActivo('todos');
  }, []);

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
        searchPlaceholder="Buscar por guía, ref, consignatario, teléfono o estado..."
        onSearchChange={setSearch}
      />

      {error && (
        <InlineErrorBanner
          message={
            allPaquetes.length > 0
              ? 'No se pudieron actualizar los paquetes vencidos'
              : 'Error al cargar paquetes vencidos'
          }
          hint={
            allPaquetes.length > 0
              ? 'Mostrando los resultados anteriores. Reintentando en segundo plano.'
              : 'Verifica tu conexión o intenta de nuevo.'
          }
          onRetry={() => refetch()}
          retrying={isFetching}
        />
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

      {allPaquetes.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <>
              <ChipFiltro
                label="Todos"
                count={chipCounts.todos}
                active={chipActivo === 'todos'}
                onClick={() => setChipActivo('todos')}
              />
              <ChipFiltro
                label="Leves (<7d)"
                count={chipCounts.leve}
                active={chipActivo === 'leve'}
                tone="warning"
                onClick={() => setChipActivo('leve')}
                hideWhenZero
              />
              <ChipFiltro
                label="Altos (7-14d)"
                count={chipCounts.alto}
                active={chipActivo === 'alto'}
                tone="warning"
                onClick={() => setChipActivo('alto')}
                hideWhenZero
              />
              <ChipFiltro
                label="Críticos (≥15d)"
                count={chipCounts.critico}
                active={chipActivo === 'critico'}
                tone="danger"
                onClick={() => setChipActivo('critico')}
                hideWhenZero
              />
            </>
          }
          filtros={
            (consignatarios.length > 0 || estados.length > 0) && (
              <>
                {consignatarios.length > 0 && (
                  <FiltroCampo label="Consignatario" width="w-[16rem]">
                    <SearchableCombobox<string>
                      value={consignatarioFiltro}
                      onChange={(v) =>
                        setConsignatarioFiltro(
                          v === undefined ? undefined : String(v),
                        )
                      }
                      options={consignatarios}
                      getKey={(n) => n}
                      getLabel={(n) => n}
                      placeholder="Todos"
                      searchPlaceholder="Buscar consignatario..."
                      emptyMessage="Sin consignatarios"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
                {estados.length > 0 && (
                  <FiltroCampo label="Estado" width="w-[14rem]">
                    <SearchableCombobox<string>
                      value={estadoFiltro}
                      onChange={(v) =>
                        setEstadoFiltro(v === undefined ? undefined : String(v))
                      }
                      options={estados.map((e) => e.codigo)}
                      getKey={(c) => c}
                      getLabel={(c) =>
                        estados.find((e) => e.codigo === c)?.nombre ?? c
                      }
                      placeholder="Todos"
                      searchPlaceholder="Buscar estado..."
                      emptyMessage="Sin estados"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
              </>
            )
          }
        />
      )}

      {isLoading && allPaquetes.length === 0 ? (
        <ListTableShell>
          <Table className="min-w-[920px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[16rem]">Guía master / Pieza</TableHead>
                <TableHead>Atraso</TableHead>
                <TableHead className="hidden min-w-[12rem] md:table-cell">Plazo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="min-w-[16rem]">Consignatario</TableHead>
                <TableHead className="w-12 text-right" aria-label="Acciones" />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={6}
                columnClasses={{ 2: 'hidden md:table-cell' }}
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : allPaquetes.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Sin paquetes vencidos"
          description="No hay paquetes que hayan superado el plazo máximo de retiro."
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title="Sin resultados"
          description={
            tieneFiltros
              ? 'No hay paquetes vencidos que coincidan con los filtros aplicados.'
              : 'No se encontraron paquetes vencidos con ese criterio.'
          }
          action={
            tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
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
                  <TableHead>Atraso</TableHead>
                  <TableHead className="hidden min-w-[12rem] md:table-cell">Plazo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="min-w-[16rem]">Consignatario</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
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
                    <TableCell className="align-top">
                      <AtrasoBadge dias={p.diasAtrasoRetiro ?? 0} />
                    </TableCell>
                    <TableCell className="hidden align-top md:table-cell">
                      <PlazoCell paquete={p} />
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge tone="neutral">
                        {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="max-w-[20rem] align-top">
                      <ConsignatarioCell paquete={p} />
                    </TableCell>
                    <TableCell className="text-right align-top">
                      <RowActionsMenu
                        items={[
                          {
                            label: 'Ver tracking',
                            icon: Eye,
                            onSelect: () =>
                              void navigate({
                                to: '/tracking',
                                search: { numeroGuia: p.numeroGuia } as never,
                              }),
                          },
                        ]}
                      />
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
