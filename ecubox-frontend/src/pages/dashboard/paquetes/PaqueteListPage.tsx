import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { usePaquetes, usePaquetesPaginated, useDeletePaquete } from '@/hooks/usePaquetes';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { useAuthStore } from '@/stores/authStore';
import { PaqueteForm } from './PaqueteForm';
import { PaqueteBulkCreateForm } from './PaqueteBulkCreateForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { KpiCardsGridSkeleton } from '@/components/skeletons/KpiCardSkeleton';
import { FiltrosBarSkeleton } from '@/components/skeletons/FiltrosBarSkeleton';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu, type RowActionEntry } from '@/components/RowActionsMenu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/TablePagination';
import {
  ClipboardList,
  Layers,
  Package,
  Pencil,
  Plus,
  Trash2,
  Users,
  Weight,
} from 'lucide-react';
import type { Paquete } from '@/types/paquete';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { GuiaMasterPiezaCell, ConsignatarioCell } from './PaqueteCells';

export function PaqueteListPage() {
  const hasPaquetesCreate = useAuthStore((s) => s.hasPermission('PAQUETES_CREATE'));
  const hasPaquetesUpdate = useAuthStore((s) => s.hasPermission('PAQUETES_UPDATE'));
  const hasPaquetesDelete = useAuthStore((s) => s.hasPermission('PAQUETES_DELETE'));
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const hasGuiasMasterUpdate = useAuthStore((s) =>
    s.hasPermission('GUIAS_MASTER_UPDATE'),
  );
  // Dataset completo: alimenta KPIs, comboboxes de filtro y conteos de chips
  // (que requieren el universo total). La tabla principal usa la versión
  // paginada para soportar búsqueda en todo el dataset desde el server.
  const {
    data: paquetes,
    isLoading,
    error,
    isFetching: isFetchingAll,
    refetch: refetchAll,
  } = usePaquetes();
  const deletePaquete = useDeletePaquete();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPaquete, setEditingPaquete] = useState<Paquete | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editandoPiezasGuiaId, setEditandoPiezasGuiaId] = useState<number | null>(
    null,
  );
  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 25,
  });
  // Chip activo de estado de carga (segun datos persistidos en BD).
  const [chipActivo, setChipActivo] = useState<
    'todos' | 'sin_peso' | 'con_peso' | 'sin_guia_master' | 'vencidos'
  >('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<string | undefined>(undefined);
  const [consignatarioFiltro, setConsignatarioFiltro] = useState<string | undefined>(
    undefined,
  );
  const [envioFiltro, setEnvioFiltro] = useState<string | undefined>(undefined);
  const [guiaMasterFiltro, setGuiaMasterFiltro] = useState<number | undefined>(
    undefined,
  );

  // Resolver el id de consignatario a partir del nombre seleccionado (porque el
  // combobox actual filtra por nombre y el server filtra por id).
  const consignatarioIdFiltro = useMemo(() => {
    if (!consignatarioFiltro) return undefined;
    const match = (paquetes ?? []).find(
      (p) => (p.consignatarioNombre ?? '') === consignatarioFiltro,
    );
    return match?.consignatarioId ?? undefined;
  }, [consignatarioFiltro, paquetes]);

  // Solo activamos paginación servidor si el chip no es "vencidos" (que se
  // sigue resolviendo cliente sobre dataset completo).
  const useServerPage = chipActivo !== 'vencidos';

  const pageQuery = usePaquetesPaginated({
    q: q.trim() || undefined,
    estado: estadoFiltro,
    consignatarioId: consignatarioIdFiltro,
    envio: envioFiltro,
    guiaMasterId: guiaMasterFiltro,
    chip: chipActivo === 'todos' ? undefined : chipActivo,
    page,
    size,
  });

  // Listas distintas presentes en los paquetes para poblar los comboboxes.
  const estadosDisponibles = useMemo(() => {
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

  const codigosEnvio = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetes ?? []) {
      if (p.envioConsolidadoCodigo) set.add(p.envioConsolidadoCodigo);
    }
    return Array.from(set).sort();
  }, [paquetes]);

  const guiasMasterDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of paquetes ?? []) {
      if (p.guiaMasterId == null) continue;
      const label = p.guiaMasterTrackingBase ?? `#${p.guiaMasterId}`;
      if (!map.has(p.guiaMasterId)) map.set(p.guiaMasterId, label);
    }
    return Array.from(map.entries())
      .map(([id, trackingBase]) => ({ id, trackingBase }))
      .sort((a, b) =>
        a.trackingBase.localeCompare(b.trackingBase, 'es', { sensitivity: 'base' }),
      );
  }, [paquetes]);

  // baseList: aplica los filtros estructurales (sin chip) sobre el dataset
  // completo. Sirve únicamente para calcular los conteos de los chips, que
  // necesitan el universo total (no la página).
  const baseList = useMemo(() => {
    const raw = paquetes ?? [];
    const qLower = q.trim().toLowerCase();
    return raw.filter((p) => {
      if (estadoFiltro) {
        const key = p.estadoRastreoCodigo ?? p.estadoRastreoNombre ?? '';
        if (key !== estadoFiltro) return false;
      }
      if (
        consignatarioFiltro &&
        (p.consignatarioNombre ?? '') !== consignatarioFiltro
      ) {
        return false;
      }
      if (envioFiltro && (p.envioConsolidadoCodigo ?? '') !== envioFiltro) {
        return false;
      }
      if (guiaMasterFiltro != null && p.guiaMasterId !== guiaMasterFiltro) {
        return false;
      }
      if (!qLower) return true;
      return (
        p.numeroGuia?.toLowerCase().includes(qLower) ||
        (hasPesoWrite &&
          (p.guiaMasterTrackingBase?.toLowerCase().includes(qLower) ?? false)) ||
        (hasPesoWrite &&
          (p.envioConsolidadoCodigo?.toLowerCase().includes(qLower) ?? false)) ||
        (p.ref?.toLowerCase().includes(qLower) ?? false) ||
        (p.consignatarioNombre?.toLowerCase().includes(qLower) ?? false) ||
        (p.contenido?.toLowerCase().includes(qLower) ?? false)
      );
    });
  }, [
    paquetes,
    q,
    hasPesoWrite,
    estadoFiltro,
    consignatarioFiltro,
    envioFiltro,
    guiaMasterFiltro,
  ]);

  const chipCounts = useMemo(() => {
    let sinPeso = 0;
    let conPeso = 0;
    let sinGuiaMaster = 0;
    let vencidos = 0;
    for (const p of baseList) {
      const tienePeso = p.pesoLbs != null || p.pesoKg != null;
      if (tienePeso) conPeso += 1;
      else sinPeso += 1;
      if (p.guiaMasterId == null) sinGuiaMaster += 1;
      if (p.paqueteVencido) vencidos += 1;
    }
    return { todos: baseList.length, sinPeso, conPeso, sinGuiaMaster, vencidos };
  }, [baseList]);

  // Lista visible en la tabla. Si el chip "vencidos" está activo, fallback a
  // cliente sobre baseList (porque la lógica de vencimiento es compleja y no
  // está implementada server-side). En el resto de casos, usamos la página
  // del servidor (búsqueda + filtros + chip se aplican en backend).
  const list = useMemo(() => {
    if (!useServerPage) {
      return baseList.filter((p) => !!p.paqueteVencido);
    }
    return pageQuery.data?.content ?? [];
  }, [useServerPage, baseList, pageQuery.data]);

  const totalElements = useServerPage
    ? pageQuery.data?.totalElements ?? 0
    : list.length;
  const totalPages = useServerPage
    ? pageQuery.data?.totalPages ?? 0
    : Math.ceil(list.length / size);

  // KPIs sobre el universo total (no afectados por filtros para ser referencia).
  const stats = useMemo(() => {
    const all = paquetes ?? [];
    let conPeso = 0;
    let vencidos = 0;
    const consignatariosSet = new Set<number>();
    for (const p of all) {
      if (p.pesoLbs != null || p.pesoKg != null) conPeso += 1;
      if (p.paqueteVencido) vencidos += 1;
      if (p.consignatarioId != null) consignatariosSet.add(p.consignatarioId);
    }
    return {
      total: all.length,
      conPeso,
      vencidos,
      consignatarios: consignatariosSet.size,
    };
  }, [paquetes]);

  const tieneFiltros =
    !!estadoFiltro ||
    !!consignatarioFiltro ||
    !!envioFiltro ||
    guiaMasterFiltro != null ||
    chipActivo !== 'todos';

  const limpiarFiltros = useCallback(() => {
    setEstadoFiltro(undefined);
    setConsignatarioFiltro(undefined);
    setEnvioFiltro(undefined);
    setGuiaMasterFiltro(undefined);
    setChipActivo('todos');
    resetPage();
  }, [resetPage]);

  const handleSetEstado = useCallback(
    (v?: string) => {
      setEstadoFiltro(v);
      resetPage();
    },
    [resetPage],
  );
  const handleSetConsignatario = useCallback(
    (v?: string) => {
      setConsignatarioFiltro(v);
      resetPage();
    },
    [resetPage],
  );
  const handleSetEnvio = useCallback(
    (v?: string) => {
      setEnvioFiltro(v);
      resetPage();
    },
    [resetPage],
  );
  const handleSetGuiaMaster = useCallback(
    (v?: number) => {
      setGuiaMasterFiltro(v);
      resetPage();
    },
    [resetPage],
  );
  const handleSetChip = useCallback(
    (chip: typeof chipActivo) => {
      setChipActivo(chip);
      resetPage();
    },
    [resetPage],
  );

  // Si no hay datos en cache y la petición falló, mostramos el banner como
  // fallback. Si ya tenemos datos previos, dejamos pasar y mostramos el banner
  // arriba de la tabla (más abajo en el render) para que el usuario siga
  // operando con el último snapshot mientras se reintenta.
  if (error && !paquetes) {
    return (
      <InlineErrorBanner
        message="Error al cargar paquetes"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => refetchAll()}
        retrying={isFetchingAll}
      />
    );
  }

  const allPaquetes = paquetes ?? [];
  const showStaleAllBanner = !!error && allPaquetes.length > 0;
  const pageError = pageQuery.error;
  const showPageBanner = !!pageError && (pageQuery.data?.content?.length ?? 0) > 0;

  return (
    <div className="page-stack">
      <ListToolbar
        title="Gestión de paquetes"
        searchPlaceholder="Buscar por guía master, pieza/ref, envío, consignatario o contenido..."
        value={q}
        onSearchChange={setQ}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {hasPaquetesCreate && (
              <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar paquete
              </Button>
            )}
          </div>
        }
      />

      {(showStaleAllBanner || showPageBanner) && (
        <InlineErrorBanner
          message="No se pudieron actualizar los paquetes"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => {
            if (showStaleAllBanner) refetchAll();
            if (showPageBanner) pageQuery.refetch();
          }}
          retrying={isFetchingAll || pageQuery.isFetching}
        />
      )}

      {isLoading ? (
        <KpiCardsGridSkeleton count={4} />
      ) : (
        allPaquetes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Package className="h-5 w-5" />}
            label="Paquetes"
            value={stats.total}
            tone="primary"
          />
          <KpiCard
            icon={<Weight className="h-5 w-5" />}
            label="Con peso cargado"
            value={stats.conPeso}
            tone={stats.conPeso > 0 ? 'success' : 'neutral'}
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Consignatarios únicos"
            value={stats.consignatarios}
            tone="neutral"
          />
          <KpiCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Vencidos"
            value={stats.vencidos}
            tone={stats.vencidos > 0 ? 'danger' : 'neutral'}
          />
        </div>
        )
      )}

      {isLoading ? (
        <FiltrosBarSkeleton chips={5} filters={2} />
      ) : (
        allPaquetes.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <>
              <ChipFiltro
                label="Todos"
                count={chipCounts.todos}
                active={chipActivo === 'todos'}
                onClick={() => handleSetChip('todos')}
              />
              <ChipFiltro
                label="Sin peso"
                count={chipCounts.sinPeso}
                active={chipActivo === 'sin_peso'}
                tone="warning"
                onClick={() => handleSetChip('sin_peso')}
              />
              <ChipFiltro
                label="Con peso"
                count={chipCounts.conPeso}
                active={chipActivo === 'con_peso'}
                tone="success"
                onClick={() => handleSetChip('con_peso')}
              />
              <ChipFiltro
                label="Sin guía master"
                count={chipCounts.sinGuiaMaster}
                active={chipActivo === 'sin_guia_master'}
                tone="neutral"
                onClick={() => handleSetChip('sin_guia_master')}
              />
              <ChipFiltro
                label="Vencidos"
                count={chipCounts.vencidos}
                active={chipActivo === 'vencidos'}
                tone="danger"
                onClick={() => handleSetChip('vencidos')}
                hideWhenZero
              />
            </>
          }
          filtros={
            (estadosDisponibles.length > 0 ||
              consignatarios.length > 0 ||
              codigosEnvio.length > 0 ||
              guiasMasterDisponibles.length > 0) && (
              <>
                {estadosDisponibles.length > 0 && (
                  <FiltroCampo label="Estado de rastreo" width="w-[14rem]">
                    <SearchableCombobox<string>
                      value={estadoFiltro}
                      onChange={(v) =>
                        handleSetEstado(v === undefined ? undefined : String(v))
                      }
                      options={estadosDisponibles.map((e) => e.codigo)}
                      getKey={(c) => c}
                      getLabel={(c) =>
                        estadosDisponibles.find((e) => e.codigo === c)?.nombre ?? c
                      }
                      placeholder="Todos"
                      searchPlaceholder="Buscar estado..."
                      emptyMessage="Sin estados"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
                {consignatarios.length > 0 && (
                  <FiltroCampo label="Consignatario" width="w-[16rem]">
                    <SearchableCombobox<string>
                      value={consignatarioFiltro}
                      onChange={(v) =>
                        handleSetConsignatario(
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
                {guiasMasterDisponibles.length > 0 && (
                  <FiltroCampo label="Guía master" width="w-[16rem]">
                    <SearchableCombobox<number>
                      value={guiaMasterFiltro}
                      onChange={(v) =>
                        handleSetGuiaMaster(v === undefined ? undefined : Number(v))
                      }
                      options={guiasMasterDisponibles.map((g) => g.id)}
                      getKey={(id) => id}
                      getLabel={(id) =>
                        guiasMasterDisponibles.find((g) => g.id === id)?.trackingBase ??
                        `#${id}`
                      }
                      renderSelected={(id) => (
                        <span className="font-mono text-xs">
                          {guiasMasterDisponibles.find((g) => g.id === id)
                            ?.trackingBase ?? `#${id}`}
                        </span>
                      )}
                      renderOption={(id) => (
                        <span className="font-mono text-xs">
                          {guiasMasterDisponibles.find((g) => g.id === id)
                            ?.trackingBase ?? `#${id}`}
                        </span>
                      )}
                      placeholder="Todas"
                      searchPlaceholder="Buscar guía master..."
                      emptyMessage="Sin guías"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
                {hasPesoWrite && codigosEnvio.length > 0 && (
                  <FiltroCampo label="Envío consolidado" width="w-[14rem]">
                    <SearchableCombobox<string>
                      value={envioFiltro}
                      onChange={(v) =>
                        handleSetEnvio(v === undefined ? undefined : String(v))
                      }
                      options={codigosEnvio}
                      getKey={(c) => c}
                      getLabel={(c) => c}
                      renderSelected={(c) => (
                        <span className="font-mono text-xs">{c}</span>
                      )}
                      renderOption={(c) => (
                        <span className="font-mono text-xs">{c}</span>
                      )}
                      placeholder="Todos"
                      searchPlaceholder="Buscar código..."
                      emptyMessage="Sin códigos"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
              </>
            )
          }
        />
        )
      )}

      {isLoading ? (
        <ListTableShell>
          <Table className="table-mobile-cards min-w-[860px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Guía master / Pieza</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Consignatario</TableHead>
                {hasPesoWrite && (
                  <TableHead className="hidden md:table-cell">Guía de envío</TableHead>
                )}
                <TableHead className="hidden lg:table-cell">Contenido</TableHead>
                <TableHead>Peso</TableHead>
                {(hasPaquetesUpdate || hasPaquetesDelete || hasGuiasMasterUpdate) && (
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={
                  4 +
                  (hasPesoWrite ? 1 : 0) +
                  1 /* contenido */ +
                  1 /* peso */ +
                  (hasPaquetesUpdate || hasPaquetesDelete || hasGuiasMasterUpdate ? 1 : 0)
                }
                columnClasses={
                  hasPesoWrite
                    ? { 4: 'hidden md:table-cell', 5: 'hidden lg:table-cell' }
                    : { 4: 'hidden lg:table-cell' }
                }
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Package}
          title={allPaquetes.length === 0 ? 'No hay paquetes' : 'Sin resultados'}
          description={
            allPaquetes.length === 0
              ? 'Registra un paquete con su número de guía y consignatario para hacer seguimiento.'
              : tieneFiltros
                ? 'No hay paquetes que coincidan con los filtros aplicados.'
                : 'No se encontraron paquetes con ese criterio.'
          }
          action={
            allPaquetes.length === 0 && hasPaquetesCreate ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar paquete</Button>
            ) : tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {totalElements} paquete{totalElements === 1 ? '' : 's'}
            {totalElements !== allPaquetes.length ? ` de ${allPaquetes.length}` : ''}
            {pageQuery.isFetching && useServerPage ? ' · cargando...' : ''}
          </p>
        <ListTableShell>
            <Table className="table-mobile-cards min-w-[860px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead>Guía master / Pieza</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Consignatario</TableHead>
                  {hasPesoWrite && (
                    <TableHead className="hidden md:table-cell">Guía de envío</TableHead>
                  )}
                  <TableHead className="hidden lg:table-cell">Contenido</TableHead>
                  <TableHead>Peso</TableHead>
                  {(hasPaquetesUpdate ||
                    hasPaquetesDelete ||
                    hasGuiasMasterUpdate) && (
                    <TableHead className="w-12 text-right" aria-label="Acciones" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell data-label="Guía master / Pieza" className="max-w-[14rem] align-top">
                      <GuiaMasterPiezaCell paquete={p} />
                    </TableCell>
                    <TableCell data-label="Ref" className="font-mono text-xs text-muted-foreground">{p.ref ?? '—'}</TableCell>
                    <TableCell data-label="Estado">
                      <StatusBadge tone="neutral">
                        {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell data-label="Consignatario" className="align-top">
                      <ConsignatarioCell paquete={p} />
                    </TableCell>
                    {hasPesoWrite && (
                      <TableCell
                        data-label="Guía de envío"
                        className="hidden md:table-cell"
                      >
                        {p.envioConsolidadoCodigo ? (
                          <div className="flex items-center gap-1.5">
                            <MonoTrunc
                              value={p.envioConsolidadoCodigo}
                              className="text-xs"
                            />
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {p.envioConsolidadoCerrado ? 'Cerrado' : 'Abierto'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell
                      data-label="Contenido"
                      className="hidden text-muted-foreground lg:table-cell"
                    >
                      {p.contenido ?? '—'}
                    </TableCell>
                    <TableCell data-label="Peso">
                      {p.pesoLbs != null || p.pesoKg != null
                        ? [p.pesoLbs != null ? `${p.pesoLbs} lbs` : null, p.pesoKg != null ? `${p.pesoKg} kg` : null]
                            .filter(Boolean)
                            .join(' / ')
                        : '—'}
                    </TableCell>
                    {(hasPaquetesUpdate ||
                      hasPaquetesDelete ||
                      hasGuiasMasterUpdate) && (
                      <TableCell data-label="Acciones" className="text-right">
                        <RowActionsMenu
                          items={[
                            {
                              label: 'Editar paquete',
                              icon: Pencil,
                              onSelect: () => setEditingPaquete(p),
                              hidden: !hasPaquetesUpdate,
                            },
                            {
                              label: 'Editar piezas de la guía',
                              icon: Layers,
                              onSelect: () => {
                                if (p.guiaMasterId != null) {
                                  setEditandoPiezasGuiaId(p.guiaMasterId);
                                }
                              },
                              hidden:
                                !hasGuiasMasterUpdate || p.guiaMasterId == null,
                            },
                            { type: 'separator' },
                            {
                              label: 'Eliminar',
                              icon: Trash2,
                              destructive: true,
                              onSelect: () => setDeleteConfirmId(p.id),
                              hidden: !hasPaquetesDelete,
                            },
                          ] satisfies RowActionEntry[]}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </ListTableShell>
        {useServerPage && (
          <TablePagination
            page={page}
            size={size}
            totalElements={totalElements}
            totalPages={totalPages}
            onPageChange={setPage}
            onSizeChange={setSize}
            loading={pageQuery.isFetching}
          />
        )}
        </>
      )}

      {createOpen && (
        <PaqueteBulkCreateForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}

      {editingPaquete != null && (
        <PaqueteForm
          paquete={editingPaquete}
          onClose={() => setEditingPaquete(null)}
          onSuccess={() => setEditingPaquete(null)}
        />
      )}

      {editandoPiezasGuiaId != null && (
        <PaqueteBulkCreateForm
          editGuiaMasterId={editandoPiezasGuiaId}
          onClose={() => setEditandoPiezasGuiaId(null)}
          onSuccess={() => setEditandoPiezasGuiaId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar paquete"
        description="¿Estás seguro de que deseas eliminar este paquete? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deletePaquete.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deletePaquete.mutateAsync(deleteConfirmId);
            toast.success('Paquete eliminado correctamente');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el paquete');
            throw error;
          }
        }}
      />
    </div>
  );
}
