import { useCallback, useState } from 'react';
import { useNavigate, useRouterState } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  usePaqueteResumen,
  usePaquetesPaginated,
  useDeletePaquete,
} from '@/hooks/usePaquetes';
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
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { PesoCell, PESO_TABLE_CELL_CLASS, PESO_TABLE_HEAD_CLASS } from '@/components/PesoCell';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu, type RowActionEntry } from '@/components/RowActionsMenu';
import { Button } from '@/components/ui/button';
import { StatusBadge, getRastreoStatusTone } from '@/components/ui/StatusBadge';
import { BandejaTabs, type BandejaOption } from '@/components/BandejaTabs';
import { EnvioConsolidadoBadge } from '@/pages/dashboard/envios-consolidados/EnvioConsolidadoBadge';
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
  Weight,
  ShieldAlert,
  CircleCheck,
  History,
} from 'lucide-react';
import type { BandejaPaquete, Paquete } from '@/types/paquete';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { GuiaMasterPiezaCell, ConsignatarioCell } from './PaqueteCells';
import {
  RevisionPaqueteDialog,
  motivoRevisionLabel,
  type RevisionDialogMode,
} from './RevisionPaqueteDialog';

export function PaqueteListPage() {
  const navigate = useNavigate();
  const bandejaUrl = useRouterState({
    select: (state) => (state.location.search as { bandeja?: string }).bandeja,
  });
  const hasRevisionRead = useAuthStore((s) => s.hasPermission('PAQUETES_REVISION_READ'));
  // Bandeja por defecto: Operativos (vista de trabajo principal). 'todos' y
  // 'en_revision' requieren parámetro explícito en la URL.
  const bandeja: BandejaPaquete =
    bandejaUrl === 'todos' || (bandejaUrl === 'en_revision' && hasRevisionRead)
      ? bandejaUrl
      : 'operativos';
  const enRevision = bandeja === 'en_revision';
  const hasPaquetesCreate = useAuthStore((s) => s.hasPermission('PAQUETES_CREATE'));
  const hasPaquetesUpdate = useAuthStore((s) => s.hasPermission('PAQUETES_UPDATE'));
  const hasPaquetesDelete = useAuthStore((s) => s.hasPermission('PAQUETES_DELETE'));
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const hasGuiasMasterUpdate = useAuthStore((s) =>
    s.hasPermission('GUIAS_MASTER_UPDATE'),
  );
  const hasRevisionCreate = useAuthStore((s) => s.hasPermission('PAQUETES_REVISION_CREATE'));
  const hasRevisionResolve = useAuthStore((s) => s.hasPermission('PAQUETES_REVISION_RESOLVE'));
  const deletePaquete = useDeletePaquete();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPaquete, setEditingPaquete] = useState<Paquete | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editandoPiezasGuiaId, setEditandoPiezasGuiaId] = useState<number | null>(
    null,
  );
  const [revisionDialog, setRevisionDialog] = useState<{
    paquete: Paquete;
    mode: RevisionDialogMode;
  } | null>(null);

  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 25,
  });
  // Chip activo de estado de carga (segun datos persistidos en BD).
  const [chipActivo, setChipActivo] = useState<
    'todos' | 'sin_peso' | 'con_peso' | 'sin_guia_master' | 'vencidos'
  >('todos');
  const [estadoFiltro, setEstadoFiltro] = useState<string | undefined>(undefined);
  const [consignatarioFiltro, setConsignatarioFiltro] = useState<number | undefined>(
    undefined,
  );
  const [envioFiltro, setEnvioFiltro] = useState<string | undefined>(undefined);
  const [guiaMasterFiltro, setGuiaMasterFiltro] = useState<number | undefined>(
    undefined,
  );

  // Resumen liviano del backend: KPIs del universo, conteos por chip (respetando
  // los filtros estructurales activos) y opciones distintas de los comboboxes.
  // Reemplaza la descarga del dataset completo solo para alimentar la cabecera.
  const {
    data: resumen,
    isLoading: resumenLoading,
    error: resumenError,
    isFetching: resumenFetching,
    refetch: refetchResumen,
  } = usePaqueteResumen({
    q: q.trim() || undefined,
    estado: estadoFiltro,
    consignatarioId: consignatarioFiltro,
    envio: envioFiltro,
    guiaMasterId: guiaMasterFiltro,
    bandeja,
  });

  // La tabla se sirve siempre paginada desde el servidor (incluido el chip
  // "vencidos", ahora resuelto server-side vía fecha_limite_retiro).
  const pageQuery = usePaquetesPaginated({
    q: q.trim() || undefined,
    estado: estadoFiltro,
    consignatarioId: consignatarioFiltro,
    envio: envioFiltro,
    guiaMasterId: guiaMasterFiltro,
    chip: chipActivo === 'todos' ? undefined : chipActivo,
    page,
    size,
    bandeja,
  });

  // Opciones de filtro y conteos provienen del resumen (universo visible).
  const estadosDisponibles = resumen?.estados ?? [];
  const consignatarios = resumen?.consignatarios ?? [];
  const codigosEnvio = resumen?.codigosEnvio ?? [];
  const guiasMasterDisponibles = resumen?.guiasMaster ?? [];

  const chipCounts = resumen?.chips ?? {
    todos: 0,
    sinPeso: 0,
    conPeso: 0,
    sinGuiaMaster: 0,
    vencidos: 0,
  };

  const bandejaCounts = resumen?.bandejas ?? { todos: 0, operativos: 0, enRevision: 0 };

  // Opciones de bandeja (orden recomendado: Operativos, Todos, En revisión).
  // "En revisión" solo se ofrece con PAQUETES_REVISION_READ.
  const bandejaOptions: BandejaOption<BandejaPaquete>[] = [
    { value: 'operativos', label: 'Operativos', count: bandejaCounts.operativos, icon: Package, tone: 'primary' },
    { value: 'todos', label: 'Todos', count: bandejaCounts.todos, icon: Layers, tone: 'neutral' },
    {
      value: 'en_revision',
      label: 'En revisión',
      count: bandejaCounts.enRevision,
      icon: ShieldAlert,
      tone: 'warning',
      hidden: !hasRevisionRead,
    },
  ];

  const bandejaCopy: Record<BandejaPaquete, { title: string; description: string; help?: string }> = {
    operativos: {
      title: 'Paquetes operativos',
      description: 'Paquetes disponibles para continuar los procesos logísticos.',
    },
    todos: {
      title: 'Todos los paquetes',
      description: 'Consulta general de los paquetes visibles en el sistema.',
    },
    en_revision: {
      title: 'Paquetes en revisión',
      description: 'Paquetes pausados temporalmente mientras se resuelve una validación.',
      help: 'La revisión no modifica su estado logístico.',
    },
  };
  const copyActivo = bandejaCopy[bandeja];

  const stats = {
    total: resumen?.total ?? 0,
    conPeso: resumen?.conPeso ?? 0,
    vencidos: resumen?.vencidos ?? 0,
    consignatarios: resumen?.consignatariosDistintos ?? 0,
  };

  const list = pageQuery.data?.content ?? [];
  const totalElements = pageQuery.data?.totalElements ?? 0;
  const totalPages = pageQuery.data?.totalPages ?? 0;

  const tieneFiltros =
    !!estadoFiltro ||
    consignatarioFiltro != null ||
    !!envioFiltro ||
    guiaMasterFiltro != null ||
    chipActivo !== 'todos';

  const filtrosActivosCount =
    (estadoFiltro ? 1 : 0) +
    (consignatarioFiltro != null ? 1 : 0) +
    (envioFiltro ? 1 : 0) +
    (guiaMasterFiltro != null ? 1 : 0) +
    (chipActivo !== 'todos' ? 1 : 0);

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
    (v?: number) => {
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
  const cambiarBandeja = useCallback(
    (value: BandejaPaquete) => {
      // Al cambiar de bandeja: primera página, limpiar el chip de carga (no
      // aplica de forma estable entre bandejas) y cerrar diálogos dependientes.
      resetPage();
      setChipActivo('todos');
      setRevisionDialog(null);
      navigate({
        to: '/paquetes',
        search: ((previous: Record<string, unknown>) => ({
          ...previous,
          // Operativos es el valor por defecto y va sin parámetro.
          bandeja: value === 'operativos' ? undefined : value,
        })) as never,
        replace: true,
      });
    },
    [navigate, resetPage],
  );

  const pageError = pageQuery.error;
  const pageHasData = (pageQuery.data?.content?.length ?? 0) > 0;
  const pageCanRender = pageHasData || pageQuery.data != null;

  // La tabla principal se alimenta del endpoint paginado. El resumen es
  // auxiliar para KPIs/filtros; si falla no debe impedir listar paquetes.
  if (pageError && !pageCanRender && resumenError) {
    return (
      <InlineErrorBanner
        message="Error al cargar paquetes"
        hint="Verifica tu conexión o intenta de nuevo."
        onRetry={() => {
          refetchResumen();
          pageQuery.refetch();
        }}
        retrying={resumenFetching || pageQuery.isFetching}
      />
    );
  }

  // Banner suave: el resumen (KPIs/filtros) está obsoleto o la página no pudo
  // refrescarse pero aún muestra resultados previos.
  const showResumenBanner = !!resumenError;
  const showPageBanner = !!pageError && pageHasData;
  const tableLoading = pageQuery.isLoading;
  const hasDatos = stats.total > 0;
  const hasAnyPaquetes = hasDatos || totalElements > 0;

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

      <BandejaTabs<BandejaPaquete>
        value={bandeja}
        onValueChange={cambiarBandeja}
        ariaLabel="Bandejas de paquetes"
        options={bandejaOptions}
        title={copyActivo.title}
        description={copyActivo.description}
        help={copyActivo.help}
      />

      {(showResumenBanner || showPageBanner) && (
        <InlineErrorBanner
          message="No se pudieron actualizar los paquetes"
          hint={
            showResumenBanner
              ? 'Mostrando la lista paginada. Los KPIs y filtros pueden estar incompletos.'
              : 'Mostrando los resultados anteriores. Reintentando en segundo plano.'
          }
          onRetry={() => {
            if (showResumenBanner) refetchResumen();
            if (showPageBanner) pageQuery.refetch();
          }}
          retrying={resumenFetching || pageQuery.isFetching}
        />
      )}

      {resumenLoading ? (
        <KpiCardsGridSkeleton count={3} />
      ) : (
        hasDatos && (
        <KpiCardsGrid>
          <KpiCard
            icon={<Package className="h-5 w-5" />}
            label="Paquetes"
            value={stats.total}
            tone="primary"
            hint="Universo total, sin filtros"
          />
          <KpiCard
            icon={<Weight className="h-5 w-5" />}
            label="Con peso cargado"
            value={stats.conPeso}
            tone={stats.conPeso > 0 ? 'success' : 'neutral'}
            hint={`${stats.total - stats.conPeso} sin peso registrado`}
          />
          <KpiCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Vencidos"
            value={stats.vencidos}
            tone={stats.vencidos > 0 ? 'danger' : 'neutral'}
            hint={
              stats.vencidos > 0
                ? 'Superaron plazo de retiro'
                : 'Ninguno vencido'
            }
          />
        </KpiCardsGrid>
        )
      )}

      {resumenLoading ? (
        <FiltrosBarSkeleton chips={5} filters={4} />
      ) : (
        hasDatos && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          filtrosActivosCount={filtrosActivosCount}
          resumen={`${totalElements} paquete${totalElements === 1 ? '' : 's'}${
            totalElements !== stats.total ? ` de ${stats.total}` : ''
          }`}
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
                  <FiltroCampo label="Estado de rastreo">
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
                  <FiltroCampo label="Consignatario">
                    <SearchableCombobox<number>
                      value={consignatarioFiltro}
                      onChange={(v) =>
                        handleSetConsignatario(v === undefined ? undefined : Number(v))
                      }
                      options={consignatarios.map((c) => c.id)}
                      getKey={(id) => id}
                      getLabel={(id) =>
                        consignatarios.find((c) => c.id === id)?.nombre ?? `#${id}`
                      }
                      placeholder="Todos"
                      searchPlaceholder="Buscar consignatario..."
                      emptyMessage="Sin consignatarios"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
                {guiasMasterDisponibles.length > 0 && (
                  <FiltroCampo label="Guía master">
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
                  <FiltroCampo label="Envío consolidado">
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

      {tableLoading ? (
        <ListTableShell>
          <Table className="min-w-[920px] text-left">
            <TableHeader>
              <TableRow>
                <TableHead>Guía master / Pieza</TableHead>
                {enRevision ? (
                  <>
                    <TableHead>Consignatario</TableHead>
                    <TableHead>Estado logístico</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>Iniciado por</TableHead>
                  </>
                ) : (
                  <>
                <TableHead>Ref</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Consignatario</TableHead>
                {hasPesoWrite && <TableHead>Guía de envío</TableHead>}
                <TableHead>Contenido</TableHead>
                <TableHead className={PESO_TABLE_HEAD_CLASS}>Peso</TableHead>
                  </>
                )}
                {(hasPaquetesUpdate || hasPaquetesDelete || hasGuiasMasterUpdate ||
                  hasRevisionRead || hasRevisionCreate || hasRevisionResolve) && (
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRowsSkeleton
                columns={
                  (enRevision ? 6 : 4) +
                  (hasPesoWrite ? 1 : 0) +
                  1 /* contenido */ +
                  1 /* peso */ +
                  (hasPaquetesUpdate || hasPaquetesDelete || hasGuiasMasterUpdate ||
                  hasRevisionRead || hasRevisionCreate || hasRevisionResolve ? 1 : 0)
                }
              />
            </TableBody>
          </Table>
        </ListTableShell>
      ) : list.length === 0 ? (
        <EmptyState
          icon={Package}
          title={
            enRevision
              ? 'No hay paquetes en revisión'
              : bandeja === 'operativos'
                ? 'No hay paquetes operativos'
                : !hasAnyPaquetes ? 'No hay paquetes' : 'Sin resultados'
          }
          description={
            enRevision
              ? 'Cuando se inicie una revisión administrativa aparecerá aquí, sin alterar su estado logístico.'
              : bandeja === 'operativos'
                ? 'Los paquetes con revisión activa no aparecen en esta bandeja.'
                : !hasAnyPaquetes
              ? 'Registra un paquete con su número de guía y consignatario para hacer rastreo.'
              : tieneFiltros
                ? 'No hay paquetes que coincidan con los filtros aplicados.'
                : 'No se encontraron paquetes con ese criterio.'
          }
          action={
            !hasAnyPaquetes && hasPaquetesCreate ? (
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
            {totalElements !== stats.total ? ` de ${stats.total}` : ''}
            {pageQuery.isFetching ? ' · cargando...' : ''}
          </p>
          <p className="text-xs text-muted-foreground md:hidden">
            Desliza horizontalmente para ver todas las columnas.
          </p>
        <ListTableShell>
            <Table className="min-w-[920px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead>Guía master / Pieza</TableHead>
                  {enRevision ? (
                    <>
                      <TableHead>Consignatario</TableHead>
                      <TableHead>Estado logístico</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Inicio</TableHead>
                      <TableHead>Iniciado por</TableHead>
                    </>
                  ) : (
                    <>
                  <TableHead>Ref</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Consignatario</TableHead>
                  {hasPesoWrite && <TableHead>Guía de envío</TableHead>}
                  <TableHead>Contenido</TableHead>
                  <TableHead className={PESO_TABLE_HEAD_CLASS}>Peso</TableHead>
                    </>
                  )}
                  {(hasPaquetesUpdate ||
                    hasPaquetesDelete ||
                    hasGuiasMasterUpdate ||
                    hasRevisionRead ||
                    hasRevisionCreate ||
                    hasRevisionResolve) && (
                    <TableHead className="w-12 text-right" aria-label="Acciones" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="max-w-[14rem] min-w-0 align-top">
                      <GuiaMasterPiezaCell paquete={p} />
                    </TableCell>
                    {enRevision ? (
                      <>
                        <TableCell className="min-w-[12rem] max-w-[18rem] align-top">
                          <ConsignatarioCell paquete={p} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <StatusBadge tone={getRastreoStatusTone(p.estadoRastreoTipoFlujo)}>
                            {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="max-w-[14rem]">
                          <div className="font-medium">{motivoRevisionLabel(p.revisionActiva?.motivo)}</div>
                          {p.revisionActiva?.observacionInicio && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {p.revisionActiva.observacionInicio}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                          {p.revisionActiva?.fechaInicio
                            ? new Intl.DateTimeFormat('es-EC', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              }).format(new Date(p.revisionActiva.fechaInicio))
                            : '—'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {p.revisionActiva?.iniciadoPorUsername ?? '—'}
                        </TableCell>
                      </>
                    ) : (
                      <>
                    <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                      {p.ref ?? '—'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <StatusBadge tone={getRastreoStatusTone(p.estadoRastreoTipoFlujo)}>
                        {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="min-w-[12rem] max-w-[18rem] align-top">
                      <ConsignatarioCell paquete={p} />
                    </TableCell>
                    {hasPesoWrite && (
                      <TableCell className="min-w-0 whitespace-nowrap">
                        {p.envioConsolidadoCodigo ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <MonoTrunc
                              value={p.envioConsolidadoCodigo}
                              className="text-xs"
                            />
                            <EnvioConsolidadoBadge
                              cerrado={!!p.envioConsolidadoCerrado}
                              estadoOperativo={p.envioConsolidadoEstadoOperativo}
                            />
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="max-w-[12rem] text-muted-foreground">
                      <span className="line-clamp-2 break-words text-sm">
                        {p.contenido ?? '—'}
                      </span>
                    </TableCell>
                    <TableCell className={PESO_TABLE_CELL_CLASS}>
                      <PesoCell pesoLbs={p.pesoLbs} pesoKg={p.pesoKg} />
                    </TableCell>
                      </>
                    )}
                    {(hasPaquetesUpdate ||
                      hasPaquetesDelete ||
                      hasGuiasMasterUpdate ||
                      hasRevisionRead ||
                      hasRevisionCreate ||
                      hasRevisionResolve) && (
                      <TableCell className="text-right">
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
                                !hasGuiasMasterUpdate || p.guiaMasterId == null ||
                                p.revisionActiva != null,
                            },
                            {
                              label: 'Iniciar revisión',
                              icon: ShieldAlert,
                              onSelect: () => setRevisionDialog({ paquete: p, mode: 'iniciar' }),
                              hidden: !hasRevisionCreate || p.revisionActiva != null,
                            },
                            {
                              label: 'Resolver revisión',
                              icon: CircleCheck,
                              onSelect: () => setRevisionDialog({ paquete: p, mode: 'resolver' }),
                              hidden: !hasRevisionResolve || p.revisionActiva == null,
                            },
                            {
                              label: 'Ver historial',
                              icon: History,
                              onSelect: () => setRevisionDialog({ paquete: p, mode: 'historial' }),
                              hidden: !hasRevisionRead,
                            },
                            { type: 'separator' },
                            {
                              label: 'Eliminar',
                              icon: Trash2,
                              destructive: true,
                              onSelect: () => setDeleteConfirmId(p.id),
                              hidden: !hasPaquetesDelete || p.revisionActiva != null,
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
        <TablePagination
          page={page}
          size={size}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={setSize}
          loading={pageQuery.isFetching}
        />
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
      {revisionDialog && (
        <RevisionPaqueteDialog
          paquete={revisionDialog.paquete}
          mode={revisionDialog.mode}
          onClose={() => setRevisionDialog(null)}
        />
      )}
    </div>
  );
}
