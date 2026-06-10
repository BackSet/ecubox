import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  Ban,
  Boxes,
  CalendarClock,
  Check,
  CheckSquare,
  CheckCircle2,
  CircleDollarSign,
  Eye,
  ListChecks,
  Lock,
  Package as PackageIcon,
  PlaneLanding,
  Plus,
  Scale,
  Search,
  Square,
  Tag,
  Trash2,
  Truck,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BulkGuiaInputPanel } from '@/components/BulkGuiaInputPanel';
import { buscarPaquetesPorGuias } from '@/lib/api/paquetes.service';
import { envioConsolidadoCreateSchema, validateGuiaList } from '@/lib/schemas';
import type { Paquete } from '@/types/paquete';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { PesoCell, PESO_TABLE_CELL_CLASS, PESO_TABLE_HEAD_CLASS } from '@/components/PesoCell';
import { TableRowsSkeleton } from '@/components/TableRowsSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { InlineErrorBanner } from '@/components/InlineErrorBanner';
import { KpiCard } from '@/components/KpiCard';
import { KpiCardsGrid } from '@/components/KpiCardsGrid';
import { ChipFiltro, type ChipFiltroTone } from '@/components/ChipFiltro';
import type { StatusTone } from '@/components/ui/StatusBadge';
import { FiltrosBar } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { TablePagination } from '@/components/ui/TablePagination';
import { cn } from '@/lib/utils';
import {
  useEnviarDesdeUsaEnvioConsolidado,
  useCerrarConsolidadoEnvioConsolidado,
  useArribarEcuadorEnvioConsolidado,
  useCancelarEnvioConsolidado,
  useAplicarEstadoEnConsolidados,
  useElegiblesParaEstadoRastreoConsolidados,
  useEstadosAplicablesConsolidados,
  useAplicarTransicionConsolidados,
  useCrearEnvioConsolidado,
  useEliminarEnvioConsolidado,
  useEnviosConsolidados,
  useEnvioConsolidadoResumen,
  useReabrirEnvioConsolidado,
} from '@/hooks/useEnviosConsolidados';
import { useSearchPagination } from '@/hooks/useSearchPagination';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { AplicarEstadoMasivoDialog } from '@/components/AplicarEstadoMasivoDialog';
import type { EstadoFiltro, EstadoPagoFiltro } from '@/lib/api/envios-consolidados.service';
import type { EstadoPagoConsolidado } from '@/types/envio-consolidado';
import { useAuthStore } from '@/stores/authStore';
import {
  EnvioConsolidadoBadge,
  ENVIO_CONSOLIDADO_ESTADO_ORDEN,
  ENVIO_CONSOLIDADO_ESTADO_UI,
  resolveEstadoOperativoConsolidado,
} from './EnvioConsolidadoBadge';
import type { EstadoEnvioConsolidadoOperativo } from '@/types/envio-consolidado';

import { formatWeightFromValues, formatWeightInline, LBS_TO_KG } from '@/lib/utils/weight';

export function EnviosConsolidadosListPage() {
  const navigate = useNavigate();
  const { q, page, size, setQ, setPage, setSize, resetPage } = useSearchPagination({
    initialSize: 20,
  });
  const [estadoFilter, setEstadoFilter] = useState<EstadoFiltro>('TODOS');
  const [estadoPagoFilter, setEstadoPagoFilter] = useState<EstadoPagoFiltro>('TODOS');
  const [createOpen, setCreateOpen] = useState(false);
  const [aplicarEstadoOpen, setAplicarEstadoOpen] = useState(false);
  
  const [tipoAccionMasiva, setTipoAccionMasiva] = useState<'operativa' | 'rastreo'>('operativa');
  const [estadoOperativoSeleccionado, setEstadoOperativoSeleccionado] =
    useState<TransicionOperativa | null>(null);
  const [estadoRastreoSeleccionado, setEstadoRastreoSeleccionado] = useState<number | null>(null);

  const [consolidadosSeleccionados, setConsolidadosSeleccionados] = useState<number[]>([]);
  const [confirmCerrar, setConfirmCerrar] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmEnviarUsa, setConfirmEnviarUsa] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmArribarEcuador, setConfirmArribarEcuador] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmReabrir, setConfirmReabrir] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmCancelar, setConfirmCancelar] = useState<{ id: number; codigo: string } | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<{
    id: number;
    codigo: string;
    totalPaquetes: number;
  } | null>(null);

  const cerrarMutation = useCerrarConsolidadoEnvioConsolidado();
  const enviarUsaMutation = useEnviarDesdeUsaEnvioConsolidado();
  const arribarEcuadorMutation = useArribarEcuadorEnvioConsolidado();
  const reabrirMutation = useReabrirEnvioConsolidado();
  const cancelarMutation = useCancelarEnvioConsolidado();
  const eliminarMutation = useEliminarEnvioConsolidado();
  const aplicarTransicionMutation = useAplicarTransicionConsolidados();
  const aplicarEstadoMutation = useAplicarEstadoEnConsolidados();

  const hasEnviosUpdate = useAuthStore((s) =>
    s.hasPermission('ENVIOS_CONSOLIDADOS_UPDATE'),
  );
  const hasEnviosDelete = useAuthStore((s) =>
    s.hasPermission('ENVIOS_CONSOLIDADOS_DELETE'),
  );
  const hasEnviosCreate = useAuthStore((s) =>
    s.hasPermission('ENVIOS_CONSOLIDADOS_CREATE'),
  );

  const { data, isLoading, isFetching, error, refetch } = useEnviosConsolidados({
    estado: estadoFilter,
    estadoPago: estadoPagoFilter,
    q: q.trim() || undefined,
    page,
    size,
  });

  async function handleCerrar() {
    if (!confirmCerrar) return;
    try {
      await cerrarMutation.mutateAsync(confirmCerrar.id);
      toast.success(`Envío ${confirmCerrar.codigo} cerrado para registro`);
      setConfirmCerrar(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo cerrar el envío');
    }
  }

  async function handleEnviarUsa() {
    if (!confirmEnviarUsa) return;
    try {
      await enviarUsaMutation.mutateAsync(confirmEnviarUsa.id);
      toast.success(`Envío ${confirmEnviarUsa.codigo} enviado desde USA`);
      setConfirmEnviarUsa(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo enviar desde USA');
    }
  }

  async function handleArribarEcuador() {
    if (!confirmArribarEcuador) return;
    try {
      await arribarEcuadorMutation.mutateAsync(confirmArribarEcuador.id);
      toast.success(`Envío ${confirmArribarEcuador.codigo} registrado como arribado a Ecuador`);
      setConfirmArribarEcuador(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo registrar el arribo');
    }
  }

  async function handleReabrir() {
    if (!confirmReabrir) return;
    try {
      await reabrirMutation.mutateAsync(confirmReabrir.id);
      toast.success(`Envío ${confirmReabrir.codigo} reabierto`);
      setConfirmReabrir(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo reabrir el envío');
    }
  }

  async function handleCancelar() {
    if (!confirmCancelar) return;
    try {
      await cancelarMutation.mutateAsync(confirmCancelar.id);
      toast.success(`Envío ${confirmCancelar.codigo} cancelado`);
      setConfirmCancelar(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo cancelar el envío');
    }
  }

  async function handleEliminar(eliminarPaquetes: boolean) {
    if (!confirmEliminar) return;
    try {
      await eliminarMutation.mutateAsync({
        id: confirmEliminar.id,
        eliminarPaquetes,
      });
      const totales = confirmEliminar.totalPaquetes;
      if (eliminarPaquetes && totales > 0) {
        toast.success(
          `Envío ${confirmEliminar.codigo} y ${totales} paquete${totales === 1 ? '' : 's'} eliminados`,
        );
      } else if (totales > 0) {
        toast.success(
          `Envío ${confirmEliminar.codigo} eliminado · ${totales} paquete${totales === 1 ? '' : 's'} desasociado${totales === 1 ? '' : 's'}`,
        );
      } else {
        toast.success(`Envío ${confirmEliminar.codigo} eliminado`);
      }
      setConfirmEliminar(null);
    } catch (err: unknown) {
      const r = (err as { response?: { data?: { message?: string } } })?.response;
      toast.error(r?.data?.message ?? 'No se pudo eliminar el envío');
    }
  }

  // Resumen liviano server-side: conteo por estado operativo (KPIs/chips) y por
  // estado de pago. Evita descargar el dataset completo en cada visita al listado.
  const { data: resumen } = useEnvioConsolidadoResumen();

  // Carga completa SOLO para el selector de acción masiva operativa, que filtra
  // por estado operativo derivado en cliente. Se carga de forma diferida (lazy):
  // únicamente cuando el modal de acción masiva operativa está abierto.
  const { data: dataTodos } = useEnviosConsolidados(
    { estado: 'TODOS', page: 0, size: 1000 },
    aplicarEstadoOpen && tipoAccionMasiva === 'operativa',
  );

  const stats = useMemo(() => {
    const porOperativo: Record<EstadoEnvioConsolidadoOperativo, number> = {
      VACIO: 0,
      EN_PREPARACION: 0,
      CERRADO: 0,
      ENVIADO_DESDE_USA: 0,
      ARRIBADO_ECUADOR: 0,
      RECIBIDO_EN_BODEGA: 0,
      LIQUIDADO: 0,
      CANCELADO: 0,
    };
    return {
      total: resumen?.total ?? 0,
      porOperativo: resumen?.porOperativo ?? porOperativo,
      pagados: resumen?.pagados ?? 0,
      noPagados: resumen?.noPagados ?? 0,
    };
  }, [resumen]);

  function chipToneFromStatus(tone: StatusTone): ChipFiltroTone {
    if (tone === 'info' || tone === 'primary') return 'primary';
    if (tone === 'error') return 'danger';
    if (tone === 'warning') return 'warning';
    if (tone === 'success') return 'success';
    return 'neutral';
  }

  const OPERATIVO_FILTROS: {
    key: EstadoFiltro;
    estado: EstadoEnvioConsolidadoOperativo;
  }[] = [
    { key: 'VACIO', estado: 'VACIO' },
    { key: 'EN_PREPARACION', estado: 'EN_PREPARACION' },
    { key: 'CERRADO', estado: 'CERRADO' },
    { key: 'ENVIADO_DESDE_USA', estado: 'ENVIADO_DESDE_USA' },
    { key: 'ARRIBADO_ECUADOR', estado: 'ARRIBADO_ECUADOR' },
    { key: 'RECIBIDO_EN_BODEGA', estado: 'RECIBIDO_EN_BODEGA' },
    { key: 'LIQUIDADO', estado: 'LIQUIDADO' },
    { key: 'CANCELADO', estado: 'CANCELADO' },
  ];

  const items = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const search = q;

  function abrirAplicarEstado(id?: number) {
    setConsolidadosSeleccionados(id != null ? [id] : []);
    setAplicarEstadoOpen(true);
  }

  // Estados aplicables para el combo de rastreo
  const { data: estadosAplicables } = useEstadosAplicablesConsolidados(
    aplicarEstadoOpen && tipoAccionMasiva === 'rastreo'
  );

  // Consolidados elegibles (regla "ir de 1 en 1") para el estado de rastreo seleccionado
  const { data: elegiblesEstadoRastreo } = useElegiblesParaEstadoRastreoConsolidados(
    estadoRastreoSeleccionado,
    aplicarEstadoOpen && tipoAccionMasiva === 'rastreo'
  );

  const bulkOptions = useMemo(() => {
    if (tipoAccionMasiva === 'operativa') {
      return [
        { value: 'CERRADO', label: 'Cerrar envío' },
        { value: 'ENVIADO_DESDE_USA', label: 'Enviar desde USA' },
        { value: 'ARRIBADO_ECUADOR', label: 'Arribar a Ecuador' },
        { value: 'EN_PREPARACION', label: 'Reabrir (En preparación)' },
        { value: 'CANCELADO', label: 'Cancelar envío' },
      ];
    } else {
      return (estadosAplicables ?? []).map((est) => ({
        value: String(est.id),
        label: est.nombre,
        meta: est.tipoFlujo,
      }));
    }
  }, [tipoAccionMasiva, estadosAplicables]);

  const bulkSelectedOption = useMemo(() => {
    if (tipoAccionMasiva === 'operativa') {
      return estadoOperativoSeleccionado ?? '';
    } else {
      return estadoRastreoSeleccionado ? String(estadoRastreoSeleccionado) : '';
    }
  }, [tipoAccionMasiva, estadoOperativoSeleccionado, estadoRastreoSeleccionado]);

  function handleBulkSelectedOptionChange(value: string) {
    if (tipoAccionMasiva === 'operativa') {
      setEstadoOperativoSeleccionado((value || null) as TransicionOperativa | null);
    } else {
      setEstadoRastreoSeleccionado(value ? Number(value) : null);
    }
    setConsolidadosSeleccionados([]);
  }

  const bulkItems = useMemo(() => {
    const all = dataTodos?.content ?? [];
    if (tipoAccionMasiva === 'operativa') {
      if (!estadoOperativoSeleccionado) return [];
      const origenesRequeridos = OPERATIVO_FUENTE[estadoOperativoSeleccionado];
      return all
        .filter((envio) => {
          const operativo = resolveEstadoOperativoConsolidado(envio);
          return origenesRequeridos ? origenesRequeridos.includes(operativo) : true;
        })
        .map((envio) => {
          const operativo = resolveEstadoOperativoConsolidado(envio);
          return {
            id: envio.id,
            date: envio.createdAt,
            searchText: `${envio.codigo} estado:${operativo}`,
            content: (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <MonoTrunc value={envio.codigo} copy={false} className="font-medium" />
                  <div className="text-xs text-muted-foreground">
                    {envio.totalPaquetes ?? 0} paquete(s)
                    {envio.estadoPago === 'PAGADO' ? ' · Pagado' : ''}
                  </div>
                </div>
                <EnvioConsolidadoBadge
                  cerrado={envio.cerrado}
                  estadoOperativo={operativo}
                />
              </div>
            ),
          };
        });
    } else {
      if (!estadoRastreoSeleccionado) return [];
      const elegiblesIds = new Set(elegiblesEstadoRastreo ?? []);
      return all
        .filter((envio) => envio.totalPaquetes > 0 && resolveEstadoOperativoConsolidado(envio) !== 'CANCELADO')
        .filter((envio) => elegiblesIds.has(envio.id))
        .map((envio) => {
          const operativo = resolveEstadoOperativoConsolidado(envio);
          return {
            id: envio.id,
            date: envio.createdAt,
            searchText: `${envio.codigo} estado:${operativo}`,
            content: (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <MonoTrunc value={envio.codigo} copy={false} className="font-medium" />
                  <div className="text-xs text-muted-foreground">
                    {envio.totalPaquetes ?? 0} paquete(s)
                    {envio.estadoPago === 'PAGADO' ? ' · Pagado' : ''}
                  </div>
                </div>
                <EnvioConsolidadoBadge
                  cerrado={envio.cerrado}
                  estadoOperativo={operativo}
                />
              </div>
            ),
          };
        });
    }
  }, [tipoAccionMasiva, estadoOperativoSeleccionado, estadoRastreoSeleccionado, dataTodos, elegiblesEstadoRastreo]);

  const bulkOptionHelp = useMemo(() => {
    if (tipoAccionMasiva === 'operativa') {
      if (!estadoOperativoSeleccionado) {
        return 'Vacío, Recibido en bodega y Liquidado son estados no transicionables manualmente o derivados.';
      }
      if (estadoOperativoSeleccionado === 'CANCELADO') {
        return 'Cancela el envío sin importar su estado actual, salvo que ya esté «Liquidado» o «Cancelado».';
      }
      return `Solo se listan consolidados en estado ${
        OPERATIVO_FUENTE[estadoOperativoSeleccionado]
          .map((src) => `«${ENVIO_CONSOLIDADO_ESTADO_UI[src].label}»`)
          .join(' o ')
      }; los demás no son elegibles.`;
    } else {
      if (!estadoRastreoSeleccionado) {
        return 'Seleccione un estado de rastreo para ver los consolidados elegibles.';
      }
      return 'Solo se listan consolidados con paquetes en el estado de rastreo inmediatamente anterior. '
        + 'Aplica el estado seleccionado a todos los paquetes de los consolidados elegidos; '
        + 'no cambia el estado operativo de los consolidados.';
    }
  }, [tipoAccionMasiva, estadoOperativoSeleccionado, estadoRastreoSeleccionado]);

  const bulkHeaderExtra = (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-muted/20 p-3">
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Tipo de acción masiva
      </span>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={tipoAccionMasiva === 'operativa' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => {
            setTipoAccionMasiva('operativa');
            setEstadoOperativoSeleccionado(null);
            setEstadoRastreoSeleccionado(null);
            setConsolidadosSeleccionados([]);
          }}
        >
          Estado operativo del consolidado
        </Button>
        <Button
          type="button"
          size="sm"
          variant={tipoAccionMasiva === 'rastreo' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => {
            setTipoAccionMasiva('rastreo');
            setEstadoOperativoSeleccionado(null);
            setEstadoRastreoSeleccionado(null);
            setConsolidadosSeleccionados([]);
          }}
        >
          Estado de rastreo de paquetes
        </Button>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">
        {tipoAccionMasiva === 'operativa'
          ? 'Cambia el estado administrativo/operativo del Envío consolidado (ej. Cerrar, Enviar desde USA, Arribar a Ecuador).'
          : 'Aplica un Estado de rastreo a todos los Paquetes dentro de los Envíos consolidados seleccionados.'}
      </p>
    </div>
  );

  async function handleBulkConfirm() {
    if (tipoAccionMasiva === 'operativa') {
      if (!estadoOperativoSeleccionado) return;
      try {
        const resultado = await aplicarTransicionMutation.mutateAsync({
          estadoOperativoDestino: estadoOperativoSeleccionado,
          consolidadoIds: consolidadosSeleccionados,
        });
        const rechazados = resultado.rechazados?.length ?? 0;
        const msg = `${resultado.consolidadosProcesados} consolidado(s) actualizado(s)` +
          (rechazados > 0 ? ` · ${rechazados} omitido(s)` : '');
        if (rechazados > 0) toast.warning(msg);
        else toast.success(msg);
        setAplicarEstadoOpen(false);
        setConsolidadosSeleccionados([]);
      } catch (err: unknown) {
        const r = (err as { response?: { data?: { message?: string } } })?.response;
        toast.error(r?.data?.message ?? 'No se pudo aplicar el estado operativo');
      }
    } else {
      if (!estadoRastreoSeleccionado) return;
      try {
        const resultado = await aplicarEstadoMutation.mutateAsync({
          consolidadoIds: consolidadosSeleccionados,
          estadoRastreoId: estadoRastreoSeleccionado,
        });
        toast.success(
          `${resultado.consolidadosProcesados} consolidado(s) y ${resultado.paquetesActualizados} paquete(s) actualizados con el nuevo estado de rastreo`
        );
        setAplicarEstadoOpen(false);
        setConsolidadosSeleccionados([]);
      } catch (err: unknown) {
        const r = (err as { response?: { data?: { message?: string } } })?.response;
        toast.error(r?.data?.message ?? 'No se pudo aplicar el estado de rastreo');
      }
    }
  }

  return (
    <div className="page-stack">
      <ListToolbar
        title="Envíos consolidados"
        searchPlaceholder="Buscar por código..."
        value={q}
        onSearchChange={setQ}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {hasEnviosUpdate && (
              <Button variant="outline" onClick={() => abrirAplicarEstado()}>
                <Tag className="mr-2 h-4 w-4" />
                Aplicar estado
              </Button>
            )}
            {hasEnviosCreate && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo envío
              </Button>
            )}
          </div>
        }
      />

      <KpiCardsGrid>
        {(['EN_PREPARACION', 'ENVIADO_DESDE_USA', 'RECIBIDO_EN_BODEGA'] as const).map((estado) => {
          const ui = ENVIO_CONSOLIDADO_ESTADO_UI[estado];
          const Icon = ui.icon;
          const kpiTone =
            ui.tone === 'error'
              ? 'danger'
              : ui.tone === 'info'
                ? 'info'
                : ui.tone;
          return (
            <KpiCard
              key={estado}
              icon={<Icon className="h-5 w-5" />}
              label={ui.label}
              value={stats.porOperativo[estado]}
              tone={kpiTone}
            />
          );
        })}
      </KpiCardsGrid>

      <FiltrosBar
        hayFiltrosActivos={estadoFilter !== 'TODOS' || estadoPagoFilter !== 'TODOS'}
        onLimpiar={() => {
          setEstadoFilter('TODOS');
          setEstadoPagoFilter('TODOS');
          resetPage();
        }}
        chips={
          <>
            <ChipFiltro
              label="Todos"
              count={stats.total}
              active={estadoFilter === 'TODOS'}
              onClick={() => {
                setEstadoFilter('TODOS');
                resetPage();
              }}
            />
            {OPERATIVO_FILTROS.map(({ key, estado }) => (
              <ChipFiltro
                key={key}
                label={ENVIO_CONSOLIDADO_ESTADO_UI[estado].label}
                count={stats.porOperativo[estado]}
                active={estadoFilter === key}
                tone={chipToneFromStatus(ENVIO_CONSOLIDADO_ESTADO_UI[estado].tone)}
                onClick={() => {
                  setEstadoFilter(key);
                  resetPage();
                }}
              />
            ))}
            <span className="mx-1 hidden h-5 w-px bg-[var(--color-border)] md:inline-block" />
            <ChipFiltro
              label="No pagados"
              count={stats.noPagados}
              active={estadoPagoFilter === 'NO_PAGADO'}
              tone="warning"
              onClick={() => {
                setEstadoPagoFilter(estadoPagoFilter === 'NO_PAGADO' ? 'TODOS' : 'NO_PAGADO');
                resetPage();
              }}
            />
            <ChipFiltro
              label="Pagados"
              count={stats.pagados}
              active={estadoPagoFilter === 'PAGADO'}
              tone="success"
              onClick={() => {
                setEstadoPagoFilter(estadoPagoFilter === 'PAGADO' ? 'TODOS' : 'PAGADO');
                resetPage();
              }}
            />
          </>
        }
      />

      {error && items.length > 0 && (
        <InlineErrorBanner
          message="No se pudieron actualizar los envíos"
          hint="Mostrando los resultados anteriores. Reintentando en segundo plano."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      )}

      {error && items.length === 0 && !isLoading ? (
        <InlineErrorBanner
          message="Error al cargar envíos consolidados"
          hint="Verifica tu conexión o intenta de nuevo."
          onRetry={() => refetch()}
          retrying={isFetching}
        />
      ) : !isLoading && items.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={
            search
              ? 'Sin resultados'
              : estadoFilter === 'TODOS'
                ? 'Sin envíos'
                : `No hay envíos ${ENVIO_CONSOLIDADO_ESTADO_UI[estadoFilter as EstadoEnvioConsolidadoOperativo]?.label.toLowerCase() ?? 'con este filtro'}`
          }
          description={
            search
              ? `No se encontraron envíos con "${search}".`
              : 'Crea un nuevo envío consolidado y agrupa las piezas listas para despachar.'
          }
          action={
            !search ? (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo envío
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <ListTableShell>
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Pago</TableHead>
                  <TableHead className="text-center">Paquetes</TableHead>
                  <TableHead className={PESO_TABLE_HEAD_CLASS}>Peso</TableHead>
                  <TableHead>Creado</TableHead>
                  <TableHead className="hidden md:table-cell">Cerrado</TableHead>
                  <TableHead className="hidden md:table-cell">Salida USA</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && (
                  <TableRowsSkeleton
                    columns={9}
                    columnClasses={{ 6: 'hidden md:table-cell', 7: 'hidden md:table-cell' }}
                  />
                )}
                {items.map((e) => {
                  const op = resolveEstadoOperativoConsolidado(e);
                  return (
                    <TableRow
                      key={e.id}
                      className="cursor-pointer"
                      onClick={() =>
                        navigate({
                          to: '/envios-consolidados/$id',
                          params: { id: String(e.id) },
                        })
                      }
                    >
                      <TableCell>
                        <MonoTrunc
                          value={e.codigo}
                          className="font-medium text-foreground"
                        />
                      </TableCell>
                      <TableCell>
                        <EnvioConsolidadoBadge
                          cerrado={e.cerrado}
                          estadoOperativo={op}
                        />
                      </TableCell>
                      <TableCell>
                        <PagoBadge estado={e.estadoPago} />
                      </TableCell>
                      <TableCell className="text-center">
                        <PaquetesBadge total={e.totalPaquetes ?? 0} />
                      </TableCell>
                      <TableCell className={PESO_TABLE_CELL_CLASS}>
                        <PesoCell
                          pesoLbs={
                            e.pesoTotalLbs != null && e.pesoTotalLbs > 0
                              ? e.pesoTotalLbs
                              : null
                          }
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        <FechaCell value={e.createdAt} />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        <FechaCell value={e.fechaCierre} mutedIfEmpty />
                      </TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                        <FechaCell value={e.fechaCerrado} mutedIfEmpty />
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(ev) => ev.stopPropagation()}
                      >
                        <RowActionsMenu
                          items={[
                            {
                              label: 'Ver detalle',
                              icon: Eye,
                              onSelect: () =>
                                navigate({
                                  to: '/envios-consolidados/$id',
                                  params: { id: String(e.id) },
                                }),
                            },
                            { type: 'separator' },
                            {
                              label: 'Aplicar estado',
                              icon: Tag,
                              hidden: !hasEnviosUpdate || op === 'CANCELADO' || op === 'LIQUIDADO',
                              onSelect: () => abrirAplicarEstado(e.id),
                            },
                            {
                              label: 'Cerrar envío',
                              icon: Lock,
                              hidden: !hasEnviosUpdate || op !== 'EN_PREPARACION',
                              disabled: cerrarMutation.isPending,
                              onSelect: () =>
                                setConfirmCerrar({ id: e.id, codigo: e.codigo }),
                            },
                            {
                              label: 'Enviar desde USA',
                              icon: Truck,
                              hidden: !hasEnviosUpdate || op !== 'CERRADO',
                              disabled: enviarUsaMutation.isPending,
                              onSelect: () =>
                                setConfirmEnviarUsa({ id: e.id, codigo: e.codigo }),
                            },
                            {
                              label: 'Arribar a Ecuador',
                              icon: PlaneLanding,
                              hidden: !hasEnviosUpdate || op !== 'ENVIADO_DESDE_USA',
                              disabled: arribarEcuadorMutation.isPending,
                              onSelect: () =>
                                setConfirmArribarEcuador({ id: e.id, codigo: e.codigo }),
                            },
                            {
                              label: 'Reabrir envío',
                              icon: Unlock,
                              hidden: !hasEnviosUpdate || (op !== 'CERRADO' && op !== 'ENVIADO_DESDE_USA'),
                              disabled: reabrirMutation.isPending,
                              onSelect: () =>
                                setConfirmReabrir({ id: e.id, codigo: e.codigo }),
                            },
                            {
                              label: 'Cancelar consolidado',
                              icon: Ban,
                              hidden: !hasEnviosUpdate || (op !== 'VACIO' && op !== 'EN_PREPARACION'),
                              disabled: cancelarMutation.isPending,
                              onSelect: () =>
                                setConfirmCancelar({ id: e.id, codigo: e.codigo }),
                            },
                            { type: 'separator', hidden: !hasEnviosDelete },
                            {
                              label: 'Eliminar envío',
                              icon: Trash2,
                              destructive: true,
                              hidden: !hasEnviosDelete,
                              disabled: (op !== 'VACIO' && op !== 'EN_PREPARACION') || eliminarMutation.isPending,
                              onSelect: () =>
                                setConfirmEliminar({
                                  id: e.id,
                                  codigo: e.codigo,
                                  totalPaquetes: e.totalPaquetes ?? 0,
                                }),
                            },
                          ]}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
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
            loading={isFetching}
          />
        </>
      )}

      {createOpen && <CrearEnvioConGuiasDialog onClose={() => setCreateOpen(false)} />}

      <AplicarEstadoMasivoDialog
        open={aplicarEstadoOpen}
        title="Aplicar estado a consolidados"
        description={
          tipoAccionMasiva === 'operativa'
            ? 'Selecciona una transición operativa para cambiar el estado de los consolidados seleccionados.'
            : 'Selecciona un estado de rastreo para aplicarlo a todos los paquetes de los consolidados seleccionados.'
        }
        selectionLabel="consolidados"
        searchPlaceholder="Buscar consolidado..."
        hideModoSelector={true}
        mode="seleccion"
        onModeChange={() => {}}
        dateFrom=""
        dateTo=""
        onDateFromChange={() => {}}
        onDateToChange={() => {}}
        items={bulkItems}
        selectedIds={consolidadosSeleccionados}
        onSelectedIdsChange={setConsolidadosSeleccionados}
        options={bulkOptions}
        selectedOption={bulkSelectedOption}
        onSelectedOptionChange={handleBulkSelectedOptionChange}
        optionLabel={tipoAccionMasiva === 'operativa' ? 'Estado operativo a aplicar' : 'Estado de rastreo de paquetes'}
        optionHelp={bulkOptionHelp}
        headerExtra={bulkHeaderExtra}
        periodHelp={null}
        loading={aplicarTransicionMutation.isPending || aplicarEstadoMutation.isPending}
        onOpenChange={(open) => {
          setAplicarEstadoOpen(open);
          if (!open) {
            setConsolidadosSeleccionados([]);
            setEstadoOperativoSeleccionado(null);
            setEstadoRastreoSeleccionado(null);
          }
        }}
        onConfirm={handleBulkConfirm}
      />

      <ConfirmDialog
        open={confirmCerrar !== null}
        onOpenChange={(o) => !o && setConfirmCerrar(null)}
        title="Cerrar envío consolidado"
        description={
          confirmCerrar
            ? `Al cerrar el envío "${confirmCerrar.codigo}" se detendrá el registro de nuevos paquetes y se aplicará el estado de "Cerrado" al consolidado.`
            : ''
        }
        confirmLabel="Cerrar envío"
        loading={cerrarMutation.isPending}
        onConfirm={handleCerrar}
      />

      <ConfirmDialog
        open={confirmEnviarUsa !== null}
        onOpenChange={(o) => !o && setConfirmEnviarUsa(null)}
        title="Enviar consolidado desde USA"
        description={
          confirmEnviarUsa
            ? `Al marcar "${confirmEnviarUsa.codigo}" como enviado desde USA se aplicará el estado de salida a sus piezas y el consolidado quedará registrado como enviado desde origen.`
            : ''
        }
        confirmLabel="Enviar desde USA"
        loading={enviarUsaMutation.isPending}
        onConfirm={handleEnviarUsa}
      />

      <ConfirmDialog
        open={confirmArribarEcuador !== null}
        onOpenChange={(o) => !o && setConfirmArribarEcuador(null)}
        title="Registrar arribo a Ecuador"
        description={
          confirmArribarEcuador
            ? `Al marcar "${confirmArribarEcuador.codigo}" como arribado a Ecuador se registrará su llegada a aduana destino.`
            : ''
        }
        confirmLabel="Arribar a Ecuador"
        loading={arribarEcuadorMutation.isPending}
        onConfirm={handleArribarEcuador}
      />

      <ConfirmDialog
        open={confirmReabrir !== null}
        onOpenChange={(o) => !o && setConfirmReabrir(null)}
        title="Reabrir envío consolidado"
        description={
          confirmReabrir
            ? `El envío "${confirmReabrir.codigo}" volverá al estado "En preparación" y admitirá agregar y remover paquetes.`
            : ''
        }
        confirmLabel="Reabrir"
        loading={reabrirMutation.isPending}
        onConfirm={handleReabrir}
      />

      <ConfirmDialog
        open={confirmCancelar !== null}
        onOpenChange={(o) => !o && setConfirmCancelar(null)}
        title="Cancelar envío consolidado"
        description={
          confirmCancelar
            ? `Al cancelar el envío "${confirmCancelar.codigo}" quedará anulado permanentemente.`
            : ''
        }
        confirmLabel="Cancelar"
        loading={cancelarMutation.isPending}
        onConfirm={handleCancelar}
      />

      <EliminarEnvioDialog
        target={confirmEliminar}
        loading={eliminarMutation.isPending}
        onClose={() => setConfirmEliminar(null)}
        onConfirm={handleEliminar}
      />
    </div>
  );
}

type TransicionOperativa = 'CERRADO' | 'ENVIADO_DESDE_USA' | 'ARRIBADO_ECUADOR' | 'EN_PREPARACION' | 'CANCELADO';

interface AplicarTransicionPayload {
  estadoOperativoDestino: TransicionOperativa;
  consolidadoIds?: number[];
  fechaInicio?: string;
  fechaFin?: string;
}

interface AplicarEstadoConsolidadosDialogProps {
  open: boolean;
  consolidados: import('@/types/envio-consolidado').EnvioConsolidado[];
  seleccionados: number[];
  loading: boolean;
  onSeleccionChange: (ids: number[]) => void;
  onOpenChange: (open: boolean) => void;
  onConfirm: (payload: AplicarTransicionPayload) => Promise<void>;
}

/** Estados operativos que tienen una transición manual real. */
const OPERATIVOS_APLICABLES: TransicionOperativa[] = ['CERRADO', 'ENVIADO_DESDE_USA', 'ARRIBADO_ECUADOR', 'EN_PREPARACION', 'CANCELADO'];

/**
 * Estado(s) de origen requerido para cada transición. Todas avanzan/retroceden
 * 1 paso en el flujo VACIO → EN_PREPARACION → CERRADO → ENVIADO_DESDE_USA →
 * ARRIBADO_ECUADOR → RECIBIDO_EN_BODEGA → LIQUIDADO, salvo CANCELADO que se
 * admite desde cualquier estado no terminal (no LIQUIDADO ni CANCELADO).
 */
const OPERATIVO_FUENTE: Record<TransicionOperativa, EstadoEnvioConsolidadoOperativo[]> = {
  CERRADO: ['EN_PREPARACION'],
  ENVIADO_DESDE_USA: ['CERRADO'],
  ARRIBADO_ECUADOR: ['ENVIADO_DESDE_USA'],
  EN_PREPARACION: ['CERRADO', 'ENVIADO_DESDE_USA'],
  CANCELADO: ['VACIO', 'EN_PREPARACION', 'CERRADO', 'ENVIADO_DESDE_USA', 'ARRIBADO_ECUADOR', 'RECIBIDO_EN_BODEGA'],
};

function isoDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function chipToneFromStatus(tone: StatusTone): ChipFiltroTone {
  if (tone === 'info' || tone === 'primary') return 'primary';
  if (tone === 'error') return 'danger';
  if (tone === 'warning') return 'warning';
  if (tone === 'success') return 'success';
  return 'neutral';
}

export function AplicarEstadoConsolidadosDialog({
  open,
  consolidados,
  seleccionados,
  loading,
  onSeleccionChange,
  onOpenChange,
  onConfirm,
}: AplicarEstadoConsolidadosDialogProps) {
  const [modo, setModo] = useState<'periodo' | 'consolidados'>('consolidados');
  const [busqueda, setBusqueda] = useState('');
  const [estadoOperativo, setEstadoOperativo] = useState<TransicionOperativa | null>(null);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [filtroOperativo, setFiltroOperativo] = useState<
    EstadoEnvioConsolidadoOperativo | 'TODOS'
  >('TODOS');
  const seleccion = new Set(seleccionados);
  const hoy = isoDateLocal(new Date());

  const enPeriodo = useMemo(() => {
    if (!fechaInicio || !fechaFin) return null;
    const desde = new Date(`${fechaInicio}T00:00:00`).getTime();
    const hasta = new Date(`${fechaFin}T23:59:59`).getTime();
    if (desde > hasta) return { count: 0, invalid: true };
    const count = consolidados.filter((c) => {
      if (!c.createdAt) return false;
      const t = new Date(c.createdAt).getTime();
      return t >= desde && t <= hasta;
    }).length;
    return { count, invalid: false };
  }, [consolidados, fechaInicio, fechaFin]);

  const conteosOperativos = useMemo(() => {
    const counts: Record<EstadoEnvioConsolidadoOperativo, number> = {
      VACIO: 0,
      EN_PREPARACION: 0,
      CERRADO: 0,
      ENVIADO_DESDE_USA: 0,
      ARRIBADO_ECUADOR: 0,
      RECIBIDO_EN_BODEGA: 0,
      LIQUIDADO: 0,
      CANCELADO: 0,
    };
    for (const envio of consolidados) {
      counts[resolveEstadoOperativoConsolidado(envio)] += 1;
    }
    return counts;
  }, [consolidados]);

  const visibles = useMemo(() => {
    const query = busqueda.trim().toLowerCase();
    return consolidados.filter((envio) => {
      if (filtroOperativo !== 'TODOS' && resolveEstadoOperativoConsolidado(envio) !== filtroOperativo) {
        return false;
      }
      if (!query) return true;
      return envio.codigo.toLowerCase().includes(query);
    });
  }, [busqueda, consolidados, filtroOperativo]);
  const todosVisibles =
    visibles.length > 0 && visibles.every((envio) => seleccion.has(envio.id));

  const toggle = (id: number) => {
    onSeleccionChange(
      seleccion.has(id)
        ? seleccionados.filter((item) => item !== id)
        : [...seleccionados, id],
    );
  };

  const toggleVisibles = () => {
    if (todosVisibles) {
      const idsVisibles = new Set(visibles.map((envio) => envio.id));
      onSeleccionChange(seleccionados.filter((id) => !idsVisibles.has(id)));
    } else {
      onSeleccionChange(
        Array.from(new Set([...seleccionados, ...visibles.map((envio) => envio.id)])),
      );
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setModo('consolidados');
      setBusqueda('');
      setEstadoOperativo(null);
      setFechaInicio('');
      setFechaFin('');
      setFiltroOperativo('TODOS');
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            Aplicar estado a consolidados
          </DialogTitle>
          <DialogDescription>
            Aplica un estado operativo (Enviado desde USA o En preparación) a los consolidados,
            por selección o por periodo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            role="tablist"
            aria-label="Modo de aplicación"
            className="inline-flex w-full rounded-lg border border-border bg-[var(--color-muted)]/30 p-1 text-sm"
          >
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'periodo'}
              onClick={() => setModo('periodo')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 transition-colors',
                modo === 'periodo'
                  ? 'bg-background font-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <CalendarClock className="h-4 w-4" />
              Por periodo
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={modo === 'consolidados'}
              onClick={() => setModo('consolidados')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 transition-colors',
                modo === 'consolidados'
                  ? 'bg-background font-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ListChecks className="h-4 w-4" />
              Por selección
            </button>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="estado-operativo-select">Estado operativo a aplicar</Label>
            <Select
              value={estadoOperativo ?? ''}
              onValueChange={(v) => setEstadoOperativo((v || null) as TransicionOperativa | null)}
            >
              <SelectTrigger id="estado-operativo-select" className="h-9 w-full">
                <SelectValue placeholder="Selecciona un estado..." />
              </SelectTrigger>
              <SelectContent>
                {OPERATIVOS_APLICABLES.map((op) => (
                  <SelectItem key={op} value={op}>
                    {ENVIO_CONSOLIDADO_ESTADO_UI[op].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {estadoOperativo && (
              <p className="text-xs text-muted-foreground">
                Solo se aplicará a consolidados en estado «
                {OPERATIVO_FUENTE[estadoOperativo]
                  ?.map((src) => ENVIO_CONSOLIDADO_ESTADO_UI[src].label)
                  .join(' o ')}»; el resto se
                omitirá.
              </p>
            )}
          </div>

          {modo === 'consolidados' ? (
            <>
          <div className="space-y-2">
            <Label>Estado operativo del consolidado</Label>
            <div className="flex flex-wrap gap-2">
              <ChipFiltro
                label="Todos"
                count={consolidados.length}
                active={filtroOperativo === 'TODOS'}
                onClick={() => setFiltroOperativo('TODOS')}
              />
              {ENVIO_CONSOLIDADO_ESTADO_ORDEN.map((estado) => (
                <ChipFiltro
                  key={estado}
                  label={ENVIO_CONSOLIDADO_ESTADO_UI[estado].label}
                  count={conteosOperativos[estado]}
                  active={filtroOperativo === estado}
                  tone={chipToneFromStatus(ENVIO_CONSOLIDADO_ESTADO_UI[estado].tone)}
                  onClick={() =>
                    setFiltroOperativo((prev) => (prev === estado ? 'TODOS' : estado))
                  }
                />
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(event) => setBusqueda(event.target.value)}
                placeholder="Buscar consolidado..."
                className="pl-8"
              />
            </div>
            <Button type="button" variant="outline" size="sm" onClick={toggleVisibles}>
              {todosVisibles ? (
                <Square className="mr-2 h-4 w-4" />
              ) : (
                <CheckSquare className="mr-2 h-4 w-4" />
              )}
              {todosVisibles ? 'Quitar visibles' : 'Marcar visibles'}
            </Button>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border border-border">
            {visibles.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {consolidados.length === 0
                  ? 'No hay consolidados cargados.'
                  : filtroOperativo !== 'TODOS'
                    ? `No hay consolidados en estado «${ENVIO_CONSOLIDADO_ESTADO_UI[filtroOperativo].label}».`
                    : 'No hay consolidados que coincidan con la búsqueda.'}
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {visibles.map((envio) => {
                  const op = resolveEstadoOperativoConsolidado(envio);
                  return (
                    <li key={envio.id}>
                      <label
                        className={cn(
                          'flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors',
                          seleccion.has(envio.id)
                            ? 'bg-primary/5'
                            : 'hover:bg-[var(--color-muted)]/40',
                        )}
                      >
                        <Checkbox
                          checked={seleccion.has(envio.id)}
                          onCheckedChange={() => toggle(envio.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <MonoTrunc value={envio.codigo} copy={false} className="font-medium" />
                          <div className="text-xs text-muted-foreground">
                            {envio.totalPaquetes ?? 0} paquete(s)
                            {envio.estadoPago === 'PAGADO' ? ' · Pagado' : ''}
                          </div>
                        </div>
                        <EnvioConsolidadoBadge
                          cerrado={envio.cerrado}
                          estadoOperativo={op}
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="rounded-md border border-border bg-[var(--color-muted)]/30 p-3 text-sm">
            {seleccionados.length === 0
              ? 'Selecciona al menos un consolidado.'
              : `${seleccionados.length} consolidado(s) seleccionado(s).`}
          </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="periodo-desde">Fecha inicio</Label>
                  <Input
                    id="periodo-desde"
                    type="date"
                    value={fechaInicio}
                    max={hoy}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="periodo-hasta">Fecha fin</Label>
                  <Input
                    id="periodo-hasta"
                    type="date"
                    value={fechaFin}
                    min={fechaInicio || undefined}
                    max={hoy}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Se evalúan los consolidados cuya <span className="font-medium">fecha de creación</span>{' '}
                cae en el rango; se aplica solo a los que estén en el estado de origen.
              </p>
              {enPeriodo && (
                <div
                  className={cn(
                    'rounded-md border p-3 text-sm',
                    enPeriodo.invalid
                      ? 'border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
                      : 'border-[var(--color-border)] bg-[var(--color-muted)]/30 text-muted-foreground',
                  )}
                >
                  {enPeriodo.invalid
                    ? 'La fecha de inicio debe ser anterior o igual a la fecha de fin.'
                    : `${enPeriodo.count} consolidado(s) en el periodo (según datos cargados).`}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              if (estadoOperativo == null) return;
              if (modo === 'periodo') {
                void onConfirm({ estadoOperativoDestino: estadoOperativo, fechaInicio, fechaFin });
              } else {
                void onConfirm({ estadoOperativoDestino: estadoOperativo, consolidadoIds: seleccionados });
              }
            }}
            disabled={
              loading ||
              estadoOperativo == null ||
              (modo === 'periodo'
                ? !fechaInicio || !fechaFin || (enPeriodo?.invalid ?? false)
                : seleccionados.length === 0)
            }
          >
            <Tag className="mr-2 h-4 w-4" />
            {loading ? 'Aplicando...' : 'Aplicar estado'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EliminarEnvioDialogProps {
  target: { id: number; codigo: string; totalPaquetes: number } | null;
  loading: boolean;
  onClose: () => void;
  onConfirm: (eliminarPaquetes: boolean) => void;
}

function EliminarEnvioDialog({ target, loading, onClose, onConfirm }: EliminarEnvioDialogProps) {
  if (!target) return null;
  const tienePaquetes = target.totalPaquetes > 0;
  const plural = target.totalPaquetes === 1 ? '' : 's';

  return (
    <Dialog open onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
              <Trash2 className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle>Eliminar envío consolidado</DialogTitle>
              <DialogDescription className="mt-1">
                Vas a eliminar el envío{' '}
                <span className="font-mono font-medium text-foreground">{target.codigo}</span>.
                Esta acción no se puede deshacer.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {tienePaquetes ? (
          <div className="space-y-3">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 p-3 text-sm text-foreground">
              <p className="inline-flex items-center gap-1.5">
                <PackageIcon className="h-4 w-4 text-muted-foreground" />
                <span>
                  Tiene{' '}
                  <span className="font-semibold">
                    {target.totalPaquetes} paquete{plural}
                  </span>{' '}
                  asociado{plural}.
                </span>
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Elige qué hacer con esos paquetes antes de eliminar el envío.
              </p>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => onConfirm(false)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] p-3 text-left transition-colors hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-muted)]/30 disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
                  <Unlock className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    Conservar paquetes
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Los {target.totalPaquetes} paquete{plural} se desasocian del envío y siguen
                    existiendo en el sistema. Podrás asignarlos a otro envío después.
                  </span>
                </span>
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={() => onConfirm(true)}
                className={cn(
                  'group flex w-full items-start gap-3 rounded-md border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-3 text-left transition-colors hover:border-[var(--color-destructive)]/50 hover:bg-[var(--color-destructive)]/10 disabled:cursor-not-allowed disabled:opacity-60',
                )}
              >
                <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]">
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--color-destructive)]">
                    Eliminar también los paquetes
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Borra los {target.totalPaquetes} paquete{plural} junto con el envío,
                    incluyendo su historial de tracking. Acción irreversible.
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3 text-sm text-muted-foreground">
            El envío no tiene paquetes asociados. Se eliminará directamente.
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          {!tienePaquetes && (
            <Button
              type="button"
              variant="destructive"
              onClick={() => onConfirm(false)}
              disabled={loading}
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              {loading ? 'Eliminando...' : 'Eliminar envío'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PagoBadge({ estado }: { estado?: EstadoPagoConsolidado }) {
  const isPagado = estado === 'PAGADO';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        isPagado
          ? 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]'
          : 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
      )}
    >
      <CircleDollarSign className="h-3 w-3" />
      {isPagado ? 'Pagado' : 'No pagado'}
    </span>
  );
}

function PaquetesBadge({ total }: { total: number }) {
  const empty = total === 0;
  return (
    <span
      className={cn(
        'inline-flex min-w-[2.25rem] items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        empty
          ? 'border-border bg-[var(--color-muted)]/40 text-muted-foreground'
          : 'border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
      )}
    >
      <PackageIcon className="h-3 w-3" />
      {total}
    </span>
  );
}

function FechaCell({
  value,
  mutedIfEmpty = false,
}: {
  value?: string | null;
  mutedIfEmpty?: boolean;
}) {
  if (!value) {
    return (
      <span className={cn('text-xs', mutedIfEmpty ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
        —
      </span>
    );
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return <span className="text-xs text-muted-foreground">—</span>;
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

/**
 * Normaliza una línea pegada por el operario al formato canónico
 * <trackingBase> <pieza>/<total> que usa `paquete.numeroGuia`.
 */
function normalizarLineaGuia(linea: string): string {
  return linea
    .replace(/\s*\/\s*/g, '/')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseGuias(raw: string): string[] {
  const seen = new Map<string, string>();
  for (const linea of raw.split(/[\n,;]+/)) {
    const normalizada = normalizarLineaGuia(linea);
    if (!normalizada) continue;
    const key = normalizada.toLowerCase();
    if (!seen.has(key)) {
      seen.set(key, normalizada);
    }
  }
  return Array.from(seen.values());
}

function CrearEnvioConGuiasDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [codigo, setCodigo] = useState('');
  const [guiasRaw, setGuiasRaw] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [paquetesPreview, setPaquetesPreview] = useState<Paquete[] | null>(null);
  const [noEncontradasPreview, setNoEncontradasPreview] = useState<string[]>([]);
  const [codigoError, setCodigoError] = useState<string | undefined>();
  const [guiaListError, setGuiaListError] = useState<string | undefined>();
  const crear = useCrearEnvioConsolidado();

  const guias = useMemo(() => parseGuias(guiasRaw), [guiasRaw]);

  const previewStats = useMemo(() => {
    const found = paquetesPreview ?? [];
    let pesoLbs = 0;
    let yaEnOtro = 0;
    for (const p of found) {
      if (p.pesoLbs != null) pesoLbs += Number(p.pesoLbs);
      if (p.envioConsolidadoCodigo) yaEnOtro += 1;
    }
    return {
      encontradas: found.length,
      noEncontradas: noEncontradasPreview.length,
      yaEnOtro,
      pesoLbs,
      pesoKg: pesoLbs * LBS_TO_KG,
    };
  }, [paquetesPreview, noEncontradasPreview]);

  async function handlePreview() {
    if (guiasRaw.trim()) {
      const rawLines = guiasRaw
        .split(/[\n,;]+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
      const listCheck = validateGuiaList(rawLines);
      if (!listCheck.ok) {
        setGuiaListError(listCheck.errors.join(' · '));
        return;
      }
      setGuiaListError(undefined);
    }
    if (guias.length === 0) {
      toast.error('Agrega al menos un número de guía');
      return;
    }
    setPreviewLoading(true);
    try {
      const encontrados = await buscarPaquetesPorGuias(guias);
      setPaquetesPreview(encontrados);
      const set = new Set(encontrados.map((p) => p.numeroGuia.toLowerCase()));
      setNoEncontradasPreview(guias.filter((g) => !set.has(g.toLowerCase())));
    } catch {
      toast.error('No se pudo buscar las guías');
    } finally {
      setPreviewLoading(false);
    }
  }

  function handleConservarSoloFallidas() {
    if (noEncontradasPreview.length === 0) return;
    setGuiasRaw(noEncontradasPreview.join('\n'));
    setPaquetesPreview(null);
    setNoEncontradasPreview([]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (guiasRaw.trim()) {
      const rawLines = guiasRaw
        .split(/[\n,;]+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .join('\n');
      const listCheck = validateGuiaList(rawLines);
      if (!listCheck.ok) {
        setGuiaListError(listCheck.errors.join(' · '));
        return;
      }
      setGuiaListError(undefined);
    }
    const parsed = envioConsolidadoCreateSchema.safeParse({
      codigo: codigo.trim(),
      numerosGuia: guias.length > 0 ? guias : undefined,
    });
    if (!parsed.success) {
      const codigoIssue = parsed.error.issues.find((i) => i.path[0] === 'codigo');
      const guiaIssue = parsed.error.issues.find((i) => i.path[0] === 'numerosGuia');
      setCodigoError(codigoIssue?.message);
      setGuiaListError(guiaIssue?.message);
      const first = parsed.error.issues[0]?.message;
      if (first) toast.error(first);
      return;
    }
    setCodigoError(undefined);
    setGuiaListError(undefined);
    try {
      const res = await crear.mutateAsync({
        codigo: parsed.data.codigo,
        numerosGuia: parsed.data.numerosGuia,
      });
      const asociados = res.envio.totalPaquetes ?? 0;
      if (res.guiasNoEncontradas.length > 0) {
        toast.warning(
          `Envío creado con ${asociados} paquetes. No se encontraron: ${res.guiasNoEncontradas.join(', ')}`,
        );
      } else {
        toast.success(
          asociados > 0
            ? `Envío creado con ${asociados} paquete${asociados === 1 ? '' : 's'}`
            : 'Envío consolidado creado',
        );
      }
      onClose();
      navigate({
        to: '/envios-consolidados/$id',
        params: { id: String(res.envio.id) },
      });
    } catch (err: unknown) {
      const r = (err as { response?: { status?: number; data?: { message?: string } } })?.response;
      if (r?.status === 409) {
        toast.error('Ya existe un envío con ese código');
      } else {
        toast.error(r?.data?.message ?? 'Error al crear el envío');
      }
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--color-border)] px-6 pb-4 pt-6">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[var(--color-muted)] text-[var(--color-primary)]">
              <Boxes className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base">Nuevo envío consolidado</DialogTitle>
              <DialogDescription className="mt-1 text-xs">
                Crea un agrupador interno y, opcionalmente, asocia las piezas que
                viajarán en él. Puedes agregar más piezas después.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-4"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="codigo" className="mb-1 block text-xs font-medium text-muted-foreground">
                Código del envío *
              </Label>
              <Input
                id="codigo"
                value={codigo}
                onChange={(e) => {
                  setCodigo(e.target.value);
                  setCodigoError(undefined);
                }}
                placeholder="Ej: ENV-USA-2026-001"
                className="font-mono text-sm"
                autoFocus
                aria-invalid={!!codigoError}
              />
              {codigoError && (
                <p className="mt-1 text-xs text-destructive">{codigoError}</p>
              )}
              <p className="mt-1 text-[11px] text-muted-foreground">
                Identificador único interno usado por el operario en lotes de recepción y
                manifiestos.
              </p>
            </div>

            <div>
              <BulkGuiaInputPanel
                tab="lista"
                onTabChange={() => {}}
                listValue={guiasRaw}
                onListChange={(value) => {
                  setGuiasRaw(value);
                  setPaquetesPreview(null);
                  setNoEncontradasPreview([]);
                  setGuiaListError(undefined);
                }}
                individualValue=""
                onIndividualChange={() => {}}
                onProcessList={handlePreview}
                onProcessIndividual={() => {}}
                procesandoLista={previewLoading}
                showTabs={false}
                listButtonLabel="Verificar guías"
                listLabel="Piezas asociadas (opcional)"
                listPlaceholder={'12312312312 1/2\n12312312312 2/2\nABC987 1/1'}
                lineCount={guias.length}
                guiaCount={guias.length}
                validationError={guiaListError}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Una línea por pieza. Formato:{' '}
                <span className="font-mono">{'<guía> <pieza>/<total>'}</span>. Acepta
                saltos de línea, comas o punto y coma. Los espacios alrededor de la barra
                se normalizan.
              </p>
            </div>

            {paquetesPreview != null && (
              <div className="space-y-3 rounded-md border border-border bg-[var(--color-muted)]/20 p-3">
                <div className="flex flex-wrap gap-1.5">
                  {previewStats.encontradas > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-2 py-0.5 text-xs text-[var(--color-success)]">
                      <CheckCircle2 className="h-3 w-3" />
                      {previewStats.encontradas} encontrada{previewStats.encontradas === 1 ? '' : 's'}
                    </span>
                  )}
                  {previewStats.pesoLbs > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-border bg-[var(--color-background)] px-2 py-0.5 text-xs text-foreground">
                      <Scale className="h-3 w-3" />
                      {formatWeightInline(previewStats.pesoLbs, previewStats.pesoKg)}
                    </span>
                  )}
                  {previewStats.yaEnOtro > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-2 py-0.5 text-xs text-[var(--color-warning)]">
                      <AlertCircle className="h-3 w-3" />
                      {previewStats.yaEnOtro} ya en otro envío (se reasignarán)
                    </span>
                  )}
                  {previewStats.noEncontradas > 0 && (
                    <span className="inline-flex items-center gap-1 rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/10 px-2 py-0.5 text-xs text-[var(--color-destructive)]">
                      <AlertCircle className="h-3 w-3" />
                      {previewStats.noEncontradas} no encontrada{previewStats.noEncontradas === 1 ? '' : 's'}
                    </span>
                  )}
                </div>

                {paquetesPreview.length > 0 && (
                  <div>
                    <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Piezas a incluir
                    </p>
                    <ul className="max-h-44 space-y-1 overflow-auto pr-1">
                      {paquetesPreview.map((p) => {
                        const peso = formatWeightFromValues(p.pesoLbs, p.pesoKg);
                        return (
                          <li
                            key={p.id}
                            className="flex flex-wrap items-center gap-2 rounded border border-border bg-[var(--color-background)] px-2 py-1 text-xs"
                          >
                            <MonoTrunc
                              value={p.numeroGuia}
                              className="font-medium text-foreground"
                              copy={false}
                            />
                            {p.consignatarioNombre && (
                              <span className="text-muted-foreground">
                                · {p.consignatarioNombre}
                              </span>
                            )}
                            {peso && (
                              <span className="text-muted-foreground">· {peso}</span>
                            )}
                            {p.envioConsolidadoCodigo && (
                              <span className="ml-auto inline-flex items-center gap-1 rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-1.5 py-0.5 text-[10px] text-[var(--color-warning)]">
                                <AlertCircle className="h-2.5 w-2.5" />
                                ya en {p.envioConsolidadoCodigo}
                              </span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {noEncontradasPreview.length > 0 && (
                  <div className="rounded border border-[var(--color-destructive)]/30 bg-[var(--color-destructive)]/5 p-2">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-destructive)]">
                        <AlertCircle className="h-3 w-3" />
                        No encontradas
                      </span>
                      <button
                        type="button"
                        onClick={handleConservarSoloFallidas}
                        className="text-[11px] text-muted-foreground hover:text-foreground hover:underline"
                      >
                        Dejar solo no encontradas
                      </button>
                    </div>
                    <p className="mb-1 text-[11px] text-muted-foreground">
                      Verifica que el formato coincida exactamente con{' '}
                      <span className="font-mono">{'<guía> <pieza>/<total>'}</span>.
                    </p>
                    <ul className="space-y-0.5">
                      {noEncontradasPreview.map((g) => (
                        <li
                          key={g}
                          className="break-all font-mono text-xs text-[var(--color-destructive)]"
                        >
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </form>

        <DialogFooter className="border-t border-[var(--color-border)] bg-[var(--color-background)] px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
            disabled={crear.isPending || !codigo.trim()}
          >
            <Check className="mr-1.5 h-4 w-4" />
            {crear.isPending
              ? 'Creando...'
              : guias.length > 0
                ? `Crear con ${guias.length} pieza${guias.length === 1 ? '' : 's'}`
                : 'Crear envío'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
