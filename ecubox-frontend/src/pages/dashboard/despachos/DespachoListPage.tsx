import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  AlertCircle,
  Boxes,
  Building2,
  CalendarClock,
  Check,
  CheckSquare,
  Copy,
  Eye,
  FileDown,
  FileSpreadsheet,
  ListChecks,
  Loader2,
  MapPin,
  MessageCircle,
  Package as PackageIcon,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  Share2,
  Square,
  Tag,
  Trash2,
  Truck,
  UserCircle2,
  Users,
} from 'lucide-react';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu } from '@/components/RowActionsMenu';
import { toast } from 'sonner';
import {
  useDespachos,
  useDeleteDespacho,
  useMensajeWhatsAppDespachoGenerado,
  useAplicarEstadoPorPeriodo,
  useAplicarEstadoEnDespachos,
  useEstadosAplicablesDespacho,
} from '@/hooks/useOperarioDespachos';
import { useEstadosRastreoPorPunto } from '@/hooks/useEstadosRastreo';
import type { EstadoRastreo } from '@/types/estado-rastreo';
import { useMensajeWhatsAppDespacho } from '@/hooks/useMensajeWhatsAppDespacho';
import { getDespachoById } from '@/lib/api/operario-despachos.service';
import { buildDespachoPdf } from '@/lib/pdf/builders/despachoPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';
import { downloadDespachoXlsx } from '@/lib/xlsx/despachoXlsx';
import { ListToolbar } from '@/components/ListToolbar';
import { ListTableShell } from '@/components/ListTableShell';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { Despacho, TipoEntrega } from '@/types/despacho';
import { getApiErrorMessage } from '@/lib/api/error-message';

const TIPO_LABELS: Record<TipoEntrega, string> = {
  DOMICILIO: 'Domicilio',
  AGENCIA: 'Agencia',
  AGENCIA_DISTRIBUIDOR: 'Agencia distribuidor',
};

const TIPO_COLORS: Record<TipoEntrega, string> = {
  DOMICILIO:
    'border-[color-mix(in_oklab,var(--color-success)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-success)_15%,transparent)] text-[color-mix(in_oklab,var(--color-success)_75%,var(--color-foreground))]',
  AGENCIA:
    'border-[color-mix(in_oklab,var(--color-info)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-info)_15%,transparent)] text-[color-mix(in_oklab,var(--color-info)_75%,var(--color-foreground))]',
  AGENCIA_DISTRIBUIDOR:
    'border-[color-mix(in_oklab,var(--color-primary)_30%,transparent)] bg-[color-mix(in_oklab,var(--color-primary)_15%,transparent)] text-[color-mix(in_oklab,var(--color-primary)_75%,var(--color-foreground))]',
};

const SIN_FILTRO = '__all__';

export function DespachoListPage() {
  const navigate = useNavigate();
  const { data: despachos, isLoading, error } = useDespachos();
  const { data: mensajeWhatsApp } = useMensajeWhatsAppDespacho();
  const deleteMutation = useDeleteDespacho();
  const aplicarEstadoPorPeriodo = useAplicarEstadoPorPeriodo();
  const aplicarEstadoEnDespachos = useAplicarEstadoEnDespachos();
  const [aplicarEstadoOpen, setAplicarEstadoOpen] = useState(false);
  const { data: estadosAplicables } = useEstadosAplicablesDespacho(aplicarEstadoOpen);
  const { data: estadosPorPunto } = useEstadosRastreoPorPunto();

  const [search, setSearch] = useState('');
  const [tipoFiltro, setTipoFiltro] = useState<TipoEntrega | typeof SIN_FILTRO>(SIN_FILTRO);
  const [distribuidorFiltro, setDistribuidorFiltro] = useState<string | undefined>(undefined);
  // Chip rapido sobre el conjunto: hoy, ultimos 7 dias.
  const [chipPeriodo, setChipPeriodo] = useState<'todos' | 'hoy' | '7d'>('todos');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [whatsappDespachoId, setWhatsappDespachoId] = useState<number | null>(null);
  const [aplicarModo, setAplicarModo] = useState<'periodo' | 'despachos'>('periodo');
  const [periodoFechaInicio, setPeriodoFechaInicio] = useState('');
  const [periodoFechaFin, setPeriodoFechaFin] = useState('');
  const [despachosSeleccionados, setDespachosSeleccionados] = useState<number[]>([]);
  const [estadoRastreoSeleccionado, setEstadoRastreoSeleccionado] = useState<number | null>(null);
  const [exportingId, setExportingId] = useState<{ id: number; mode: 'pdf' | 'print' | 'xlsx' } | null>(null);

  const defaultEstadoId = estadosPorPunto?.estadoRastreoEnTransitoId ?? null;
  useEffect(() => {
    if (estadoRastreoSeleccionado != null) return;
    if (defaultEstadoId && estadosAplicables?.some((e) => e.id === defaultEstadoId)) {
      setEstadoRastreoSeleccionado(defaultEstadoId);
    } else if (estadosAplicables && estadosAplicables.length > 0) {
      setEstadoRastreoSeleccionado(estadosAplicables[0].id);
    }
  }, [defaultEstadoId, estadosAplicables, estadoRastreoSeleccionado]);

  const handleExportar = async (id: number, mode: 'pdf' | 'print' | 'xlsx') => {
    if (exportingId) return;
    setExportingId({ id, mode });
    try {
      const detalle = await getDespachoById(id);
      if (mode === 'xlsx') {
        await downloadDespachoXlsx(detalle);
        toast.success('Excel generado');
      } else {
        const doc = buildDespachoPdf(detalle);
        runJsPdfAction(doc, {
          mode: mode === 'pdf' ? 'download' : 'print',
          filename: `despacho-${detalle.id}.pdf`,
        });
        if (mode === 'pdf') toast.success('PDF generado');
      }
    } catch {
      toast.error('No se pudo generar el documento');
    } finally {
      setExportingId(null);
    }
  };

  const despachoWhatsapp = useMemo(
    () =>
      whatsappDespachoId != null
        ? (despachos ?? []).find((d) => d.id === whatsappDespachoId) ?? null
        : null,
    [despachos, whatsappDespachoId],
  );

  const abrirAplicarEstado = (
    modo: 'periodo' | 'despachos',
    despachoIdInicial?: number,
  ) => {
    setAplicarModo(modo);
    if (modo === 'despachos' && despachoIdInicial != null) {
      setDespachosSeleccionados([despachoIdInicial]);
    }
    setAplicarEstadoOpen(true);
  };

  const cerrarAplicarEstado = () => {
    setAplicarEstadoOpen(false);
    setPeriodoFechaInicio('');
    setPeriodoFechaFin('');
    setDespachosSeleccionados([]);
  };

  const handleAplicarEstado = async () => {
    if (estadoRastreoSeleccionado == null) {
      toast.error('Selecciona un estado a aplicar');
      return;
    }
    try {
      if (aplicarModo === 'periodo') {
        if (!periodoFechaInicio || !periodoFechaFin) {
          toast.error('Indica fecha de inicio y fin');
          return;
        }
        const res = await aplicarEstadoPorPeriodo.mutateAsync({
          fechaInicio: periodoFechaInicio,
          fechaFin: periodoFechaFin,
          estadoRastreoId: estadoRastreoSeleccionado,
        });
        toast.success(
          `Estado aplicado: ${res.despachosProcesados} despacho(s), ${res.paquetesActualizados} paquete(s) actualizado(s).`,
        );
      } else {
        if (despachosSeleccionados.length === 0) {
          toast.error('Selecciona al menos un despacho');
          return;
        }
        const res = await aplicarEstadoEnDespachos.mutateAsync({
          despachoIds: despachosSeleccionados,
          estadoRastreoId: estadoRastreoSeleccionado,
        });
        toast.success(
          `Estado aplicado: ${res.despachosProcesados} despacho(s), ${res.paquetesActualizados} paquete(s) actualizado(s).`,
        );
      }
      cerrarAplicarEstado();
    } catch (err) {
      toast.error(getApiErrorMessage(err) ?? 'Error al aplicar estado');
    }
  };

  const allDespachos = despachos ?? [];

  const distribuidoresPresentes = useMemo(() => {
    const set = new Map<string, string>();
    for (const d of allDespachos) {
      if (d.distribuidorNombre) set.set(d.distribuidorNombre, d.distribuidorNombre);
    }
    return Array.from(set.values()).sort((a, b) => a.localeCompare(b, 'es'));
  }, [allDespachos]);

  const tiposPresentes = useMemo(() => {
    const set = new Set<TipoEntrega>();
    for (const d of allDespachos) set.add(d.tipoEntrega);
    return Array.from(set);
  }, [allDespachos]);

  // Devuelve el rango (ms) acotado por el chip de periodo activo.
  const rangoChip = useMemo<{ from: number; to: number } | null>(() => {
    if (chipPeriodo === 'todos') return null;
    const ahora = new Date();
    const inicioHoy = new Date(
      ahora.getFullYear(),
      ahora.getMonth(),
      ahora.getDate(),
    );
    const dia = 24 * 60 * 60 * 1000;
    if (chipPeriodo === 'hoy') {
      return { from: inicioHoy.getTime(), to: inicioHoy.getTime() + dia };
    }
    return { from: inicioHoy.getTime() - 6 * dia, to: inicioHoy.getTime() + dia };
  }, [chipPeriodo]);

  const list = useMemo(() => {
    let raw = allDespachos;
    if (tipoFiltro !== SIN_FILTRO) {
      raw = raw.filter((d) => d.tipoEntrega === tipoFiltro);
    }
    if (distribuidorFiltro) {
      raw = raw.filter((d) => d.distribuidorNombre === distribuidorFiltro);
    }
    if (rangoChip) {
      raw = raw.filter((d) => {
        if (!d.fechaHora) return false;
        const t = new Date(d.fechaHora).getTime();
        return Number.isFinite(t) && t >= rangoChip.from && t < rangoChip.to;
      });
    }
    const q = search.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter(
      (d) =>
        d.numeroGuia?.toLowerCase().includes(q) ||
        d.distribuidorNombre?.toLowerCase().includes(q) ||
        d.destinatarioNombre?.toLowerCase().includes(q) ||
        d.destinatarioTelefono?.toLowerCase().includes(q) ||
        d.destinatarioDireccion?.toLowerCase().includes(q) ||
        d.agenciaNombre?.toLowerCase().includes(q) ||
        d.agenciaDistribuidorNombre?.toLowerCase().includes(q) ||
        d.observaciones?.toLowerCase().includes(q) ||
        d.codigoPrecinto?.toLowerCase().includes(q) ||
        d.operarioNombre?.toLowerCase().includes(q) ||
        String(d.id).includes(q),
    );
  }, [allDespachos, search, tipoFiltro, distribuidorFiltro, rangoChip]);

  // Conteo por tipo para los chips rapidos, considerando los demas filtros activos.
  const tipoCounts = useMemo(() => {
    const counts: Record<string, number> = { TODOS: 0 };
    for (const d of allDespachos) {
      // Los chips de tipo deben reflejar el universo actualmente filtrado por
      // los OTROS filtros (distribuidor + periodo + busqueda).
      if (distribuidorFiltro && d.distribuidorNombre !== distribuidorFiltro) continue;
      if (rangoChip) {
        if (!d.fechaHora) continue;
        const t = new Date(d.fechaHora).getTime();
        if (!Number.isFinite(t) || t < rangoChip.from || t >= rangoChip.to) continue;
      }
      counts.TODOS += 1;
      counts[d.tipoEntrega] = (counts[d.tipoEntrega] ?? 0) + 1;
    }
    return counts;
  }, [allDespachos, distribuidorFiltro, rangoChip]);

  const stats = useMemo(() => {
    const all = allDespachos;
    if (all.length === 0) {
      return { total: 0, hoy: 0, sacas: 0, distribuidores: 0 };
    }
    const distribuidores = new Set<string>();
    let hoy = 0;
    let sacas = 0;
    const ahora = new Date();
    const hoyStr = `${ahora.getFullYear()}-${ahora.getMonth()}-${ahora.getDate()}`;
    for (const d of all) {
      sacas += d.sacaIds?.length ?? 0;
      if (d.distribuidorNombre) distribuidores.add(d.distribuidorNombre);
      if (d.fechaHora) {
        const f = new Date(d.fechaHora);
        if (!Number.isNaN(f.getTime())) {
          const dStr = `${f.getFullYear()}-${f.getMonth()}-${f.getDate()}`;
          if (dStr === hoyStr) hoy += 1;
        }
      }
    }
    return {
      total: all.length,
      hoy,
      sacas,
      distribuidores: distribuidores.size,
    };
  }, [allDespachos]);

  const despachosEnPeriodo = useMemo(() => {
    if (!periodoFechaInicio || !periodoFechaFin) return null;
    const inicio = new Date(`${periodoFechaInicio}T00:00:00`);
    const fin = new Date(`${periodoFechaFin}T23:59:59.999`);
    if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null;
    if (inicio > fin) return { count: 0, invalid: true };
    let count = 0;
    for (const d of allDespachos) {
      if (!d.fechaHora) continue;
      const f = new Date(d.fechaHora);
      if (Number.isNaN(f.getTime())) continue;
      if (f >= inicio && f <= fin) count += 1;
    }
    return { count, invalid: false };
  }, [allDespachos, periodoFechaInicio, periodoFechaFin]);

  if (isLoading) {
    return <LoadingState text="Cargando despachos..." />;
  }
  if (error) {
    return (
      <div className="ui-alert ui-alert-error">
        Error al cargar despachos.
      </div>
    );
  }

  const plantilla = mensajeWhatsApp?.plantilla ?? '';
  const tieneFiltros =
    tipoFiltro !== SIN_FILTRO ||
    !!distribuidorFiltro ||
    chipPeriodo !== 'todos';
  const limpiarFiltros = () => {
    setTipoFiltro(SIN_FILTRO);
    setDistribuidorFiltro(undefined);
    setChipPeriodo('todos');
  };

  return (
    <div className="page-stack">
      <ListToolbar
        title="Despachos"
        searchPlaceholder="Buscar por #, guía, distribuidor, destinatario, agencia..."
        onSearchChange={setSearch}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Button
              type="button"
              variant="outline"
              onClick={() => abrirAplicarEstado('periodo')}
              className="w-full sm:w-auto"
            >
              <Tag className="mr-2 h-4 w-4" />
              Aplicar estado
            </Button>
            <Link
              to="/despachos/nuevo"
              className={cn(buttonVariants(), 'w-full sm:w-auto')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nuevo despacho
            </Link>
          </div>
        }
      />

      {allDespachos.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Truck className="h-5 w-5" />}
            label="Despachos"
            value={stats.total}
            tone="primary"
          />
          <KpiCard
            icon={<CalendarClock className="h-5 w-5" />}
            label="Despachos hoy"
            value={stats.hoy}
            tone={stats.hoy > 0 ? 'warning' : 'neutral'}
          />
          <KpiCard
            icon={<Boxes className="h-5 w-5" />}
            label="Sacas asignadas"
            value={stats.sacas}
            tone="success"
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Distribuidores"
            value={stats.distribuidores}
            tone="neutral"
          />
        </div>
      )}

      {allDespachos.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <>
              <ChipFiltro
                label="Todos"
                count={tipoCounts.TODOS ?? 0}
                active={tipoFiltro === SIN_FILTRO && chipPeriodo === 'todos'}
                onClick={() => {
                  setTipoFiltro(SIN_FILTRO);
                  setChipPeriodo('todos');
                }}
              />
              {tiposPresentes.map((t) => (
                <ChipFiltro
                  key={t}
                  label={TIPO_LABELS[t]}
                  count={tipoCounts[t] ?? 0}
                  active={tipoFiltro === t}
                  tone={
                    t === 'DOMICILIO'
                      ? 'success'
                      : t === 'AGENCIA'
                        ? 'primary'
                        : 'neutral'
                  }
                  onClick={() =>
                    setTipoFiltro(tipoFiltro === t ? SIN_FILTRO : t)
                  }
                  hideWhenZero
                />
              ))}
              <span className="mx-1 h-4 w-px bg-border" />
              <ChipFiltro
                label="Hoy"
                count={stats.hoy}
                active={chipPeriodo === 'hoy'}
                tone="warning"
                onClick={() =>
                  setChipPeriodo(chipPeriodo === 'hoy' ? 'todos' : 'hoy')
                }
                hideWhenZero
              />
              <ChipFiltro
                label="Últimos 7d"
                count={(() => {
                  const ahora = new Date();
                  const inicioHoy = new Date(
                    ahora.getFullYear(),
                    ahora.getMonth(),
                    ahora.getDate(),
                  );
                  const dia = 24 * 60 * 60 * 1000;
                  const from = inicioHoy.getTime() - 6 * dia;
                  const to = inicioHoy.getTime() + dia;
                  let n = 0;
                  for (const d of allDespachos) {
                    if (!d.fechaHora) continue;
                    const t = new Date(d.fechaHora).getTime();
                    if (Number.isFinite(t) && t >= from && t < to) n += 1;
                  }
                  return n;
                })()}
                active={chipPeriodo === '7d'}
                tone="warning"
                onClick={() =>
                  setChipPeriodo(chipPeriodo === '7d' ? 'todos' : '7d')
                }
                hideWhenZero
              />
            </>
          }
          filtros={
            distribuidoresPresentes.length > 1 && (
              <FiltroCampo label="Distribuidor" width="w-[16rem]">
                <SearchableCombobox<string>
                  value={distribuidorFiltro}
                  onChange={(v) =>
                    setDistribuidorFiltro(v === undefined ? undefined : String(v))
                  }
                  options={distribuidoresPresentes}
                  getKey={(n) => n}
                  getLabel={(n) => n}
                  placeholder="Todos"
                  searchPlaceholder="Buscar distribuidor..."
                  emptyMessage="Sin distribuidores"
                  className="h-9 w-full"
                />
              </FiltroCampo>
            )
          }
        />
      )}

      {allDespachos.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="No hay despachos"
          description="Crea un despacho para asignar sacas y enviar con un distribuidor."
          action={
            <Link to="/despachos/nuevo" className={cn(buttonVariants())}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo despacho
            </Link>
          }
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Sin resultados"
          description="No hay despachos que coincidan con la búsqueda o los filtros."
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
            {list.length} despacho{list.length === 1 ? '' : 's'}
            {list.length !== allDespachos.length ? ` de ${allDespachos.length}` : ''}
          </p>
          <ListTableShell>
            <Table className="min-w-[820px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[14rem]">Despacho</TableHead>
                  <TableHead className="w-[10rem]">Tipo</TableHead>
                  <TableHead className="min-w-[14rem]">Destino</TableHead>
                  <TableHead className="min-w-[12rem]">Distribuidor</TableHead>
                  <TableHead className="w-[8rem]">Sacas</TableHead>
                  <TableHead className="w-12 text-right" aria-label="Acciones" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((d) => (
                  <TableRow
                    key={d.id}
                    className="cursor-pointer"
                    onClick={() =>
                      navigate({
                        to: '/despachos/$id',
                        params: { id: String(d.id) },
                      })
                    }
                  >
                    <TableCell className="align-top">
                      <DespachoCell despacho={d} />
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge
                        variant="outline"
                        className={`${TIPO_COLORS[d.tipoEntrega]} font-normal`}
                      >
                        {TIPO_LABELS[d.tipoEntrega] ?? d.tipoEntrega}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[18rem] align-top">
                      <DestinoCell despacho={d} />
                    </TableCell>
                    <TableCell className="align-top">
                      <DistribuidorCell nombre={d.distribuidorNombre} />
                    </TableCell>
                    <TableCell className="align-top">
                      <SacasBadge total={d.sacaIds?.length ?? 0} />
                    </TableCell>
                    <TableCell
                      className="text-right align-top"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RowActionsMenu
                        items={[
                          {
                            label: 'Ver detalle',
                            icon: Eye,
                            onSelect: () =>
                              navigate({
                                to: '/despachos/$id',
                                params: { id: String(d.id) },
                              }),
                          },
                          {
                            label: 'Editar despacho',
                            icon: Pencil,
                            onSelect: () =>
                              navigate({
                                to: '/despachos/$id/editar',
                                params: { id: String(d.id) },
                              }),
                          },
                          { type: 'separator' },
                          {
                            label: 'Imprimir',
                            icon: Printer,
                            onSelect: () => handleExportar(d.id, 'print'),
                            loading:
                              exportingId?.id === d.id && exportingId.mode === 'print',
                            disabled: exportingId?.id === d.id,
                          },
                          {
                            label: 'Descargar PDF',
                            icon: FileDown,
                            onSelect: () => handleExportar(d.id, 'pdf'),
                            loading:
                              exportingId?.id === d.id && exportingId.mode === 'pdf',
                            disabled: exportingId?.id === d.id,
                          },
                          {
                            label: 'Descargar Excel',
                            icon: FileSpreadsheet,
                            onSelect: () => handleExportar(d.id, 'xlsx'),
                            loading:
                              exportingId?.id === d.id && exportingId.mode === 'xlsx',
                            disabled: exportingId?.id === d.id,
                          },
                          { type: 'separator' },
                          {
                            label: 'Aplicar estado',
                            icon: Tag,
                            onSelect: () => abrirAplicarEstado('despachos', d.id),
                          },
                          {
                            label: 'Mensaje WhatsApp',
                            icon: MessageCircle,
                            onSelect: () => setWhatsappDespachoId(d.id),
                            hidden: !plantilla,
                          },
                          { type: 'separator' },
                          {
                            label: 'Eliminar',
                            icon: Trash2,
                            destructive: true,
                            onSelect: () => setDeleteConfirmId(d.id),
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

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="¿Eliminar despacho?"
        description="¿Eliminar este despacho? Las sacas quedarán sin asignar. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deleteMutation.mutateAsync(deleteConfirmId);
            toast.success('Despacho eliminado');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el despacho');
            throw error;
          }
        }}
      />

      <WhatsAppDespachoDialog
        despacho={despachoWhatsapp}
        onClose={() => setWhatsappDespachoId(null)}
      />

      <AplicarEstadoDialog
        open={aplicarEstadoOpen}
        onOpenChange={(open) => {
          if (!open) cerrarAplicarEstado();
          else setAplicarEstadoOpen(open);
        }}
        modo={aplicarModo}
        onModoChange={setAplicarModo}
        fechaInicio={periodoFechaInicio}
        fechaFin={periodoFechaFin}
        onFechaInicioChange={setPeriodoFechaInicio}
        onFechaFinChange={setPeriodoFechaFin}
        despachos={allDespachos}
        despachosSeleccionados={despachosSeleccionados}
        onDespachosSeleccionadosChange={setDespachosSeleccionados}
        onConfirm={handleAplicarEstado}
        loading={
          aplicarModo === 'periodo'
            ? aplicarEstadoPorPeriodo.isPending
            : aplicarEstadoEnDespachos.isPending
        }
        despachosEnPeriodo={despachosEnPeriodo}
        estadosAplicables={estadosAplicables ?? []}
        estadoRastreoSeleccionado={estadoRastreoSeleccionado}
        onEstadoRastreoChange={setEstadoRastreoSeleccionado}
        defaultEstadoId={defaultEstadoId}
      />
    </div>
  );
}

function DespachoCell({ despacho }: { despacho: Despacho }) {
  const f = despacho.fechaHora ? new Date(despacho.fechaHora) : null;
  const valido = f && !Number.isNaN(f.getTime());
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <MonoTrunc
        value={despacho.numeroGuia}
        className="font-medium text-foreground"
      />
      <span className="font-mono text-[11px] text-muted-foreground">
        #{despacho.id}
      </span>
      {valido && (
        <span className="text-[11px] text-muted-foreground" title={f!.toLocaleString()}>
          {f!.toLocaleDateString('es-EC', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
          {' · '}
          {f!.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      {despacho.operarioNombre && (
        <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
          <UserCircle2 className="h-3 w-3" />
          <span className="truncate" title={despacho.operarioNombre}>
            {despacho.operarioNombre}
          </span>
        </span>
      )}
    </div>
  );
}

function DistribuidorCell({ nombre }: { nombre?: string | null }) {
  if (!nombre) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate" title={nombre}>
        {nombre}
      </span>
    </div>
  );
}

function DestinoCell({ despacho }: { despacho: Despacho }) {
  if (despacho.tipoEntrega === 'DOMICILIO') {
    const nombre = despacho.destinatarioNombre;
    const direccion = despacho.destinatarioDireccion;
    const telefono = despacho.destinatarioTelefono;
    if (!nombre && !direccion && !telefono) {
      return <span className="text-xs italic text-muted-foreground">—</span>;
    }
    return (
      <div className="flex min-w-0 flex-col gap-0.5 text-sm">
        {nombre && (
          <span className="truncate font-medium text-foreground" title={nombre}>
            {nombre}
          </span>
        )}
        {direccion && (
          <span
            className="line-clamp-2 inline-flex items-start gap-1 text-xs text-muted-foreground"
            title={direccion}
          >
            <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
            <span className="truncate">{direccion}</span>
          </span>
        )}
        {telefono && (
          <span className="text-[11px] text-muted-foreground">{telefono}</span>
        )}
      </div>
    );
  }

  const lugar =
    despacho.tipoEntrega === 'AGENCIA_DISTRIBUIDOR'
      ? despacho.agenciaDistribuidorNombre
      : despacho.agenciaNombre;
  if (!lugar) {
    return <span className="text-xs italic text-muted-foreground">—</span>;
  }
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm">
      <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="truncate" title={lugar}>
        {lugar}
      </span>
    </div>
  );
}

interface AplicarEstadoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  modo: 'periodo' | 'despachos';
  onModoChange: (modo: 'periodo' | 'despachos') => void;
  fechaInicio: string;
  fechaFin: string;
  onFechaInicioChange: (v: string) => void;
  onFechaFinChange: (v: string) => void;
  despachos: Despacho[];
  despachosSeleccionados: number[];
  onDespachosSeleccionadosChange: (ids: number[]) => void;
  onConfirm: () => void | Promise<void>;
  loading: boolean;
  despachosEnPeriodo: { count: number; invalid: boolean } | null;
  estadosAplicables: EstadoRastreo[];
  estadoRastreoSeleccionado: number | null;
  onEstadoRastreoChange: (id: number | null) => void;
  defaultEstadoId: number | null;
}

function AplicarEstadoDialog({
  open,
  onOpenChange,
  modo,
  onModoChange,
  fechaInicio,
  fechaFin,
  onFechaInicioChange,
  onFechaFinChange,
  despachos,
  despachosSeleccionados,
  onDespachosSeleccionadosChange,
  onConfirm,
  loading,
  despachosEnPeriodo,
  estadosAplicables,
  estadoRastreoSeleccionado,
  onEstadoRastreoChange,
  defaultEstadoId,
}: AplicarEstadoDialogProps) {
  const hoy = useMemo(() => isoDate(new Date()), []);
  const rangoInvalido = despachosEnPeriodo?.invalid ?? false;
  const rangoCompleto = !!fechaInicio && !!fechaFin;
  const sinDespachosPeriodo =
    rangoCompleto && !rangoInvalido && despachosEnPeriodo?.count === 0;
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    if (!open) setBusqueda('');
  }, [open]);

  const aplicarPreset = (preset: 'hoy' | '7d' | 'mes') => {
    const ahora = new Date();
    if (preset === 'hoy') {
      const s = isoDate(ahora);
      onFechaInicioChange(s);
      onFechaFinChange(s);
      return;
    }
    if (preset === '7d') {
      const fin = new Date();
      const inicio = new Date();
      inicio.setDate(fin.getDate() - 6);
      onFechaInicioChange(isoDate(inicio));
      onFechaFinChange(isoDate(fin));
      return;
    }
    const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const fin = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0);
    onFechaInicioChange(isoDate(inicio));
    onFechaFinChange(isoDate(fin));
  };

  const despachosOrdenados = useMemo(() => {
    return [...despachos].sort((a, b) => {
      const fa = a.fechaHora ? new Date(a.fechaHora).getTime() : 0;
      const fb = b.fechaHora ? new Date(b.fechaHora).getTime() : 0;
      return fb - fa;
    });
  }, [despachos]);

  const despachosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return despachosOrdenados;
    return despachosOrdenados.filter(
      (d) =>
        d.numeroGuia?.toLowerCase().includes(q) ||
        d.distribuidorNombre?.toLowerCase().includes(q) ||
        d.destinatarioNombre?.toLowerCase().includes(q) ||
        d.agenciaNombre?.toLowerCase().includes(q) ||
        d.agenciaDistribuidorNombre?.toLowerCase().includes(q) ||
        String(d.id).includes(q),
    );
  }, [despachosOrdenados, busqueda]);

  const seleccionados = new Set(despachosSeleccionados);
  const todosVisiblesSeleccionados =
    despachosFiltrados.length > 0 &&
    despachosFiltrados.every((d) => seleccionados.has(d.id));

  const toggleDespacho = (id: number) => {
    if (seleccionados.has(id)) {
      onDespachosSeleccionadosChange(despachosSeleccionados.filter((x) => x !== id));
    } else {
      onDespachosSeleccionadosChange([...despachosSeleccionados, id]);
    }
  };

  const toggleTodosVisibles = () => {
    if (todosVisiblesSeleccionados) {
      const visibles = new Set(despachosFiltrados.map((d) => d.id));
      onDespachosSeleccionadosChange(
        despachosSeleccionados.filter((id) => !visibles.has(id)),
      );
    } else {
      const idsVisibles = despachosFiltrados.map((d) => d.id);
      const merged = Array.from(new Set([...despachosSeleccionados, ...idsVisibles]));
      onDespachosSeleccionadosChange(merged);
    }
  };

  const limpiarSeleccion = () => onDespachosSeleccionadosChange([]);

  const sinSeleccion = despachosSeleccionados.length === 0;
  const sinEstado = estadoRastreoSeleccionado == null;
  const confirmDeshabilitado =
    loading ||
    sinEstado ||
    (modo === 'periodo'
      ? !rangoCompleto || rangoInvalido || sinDespachosPeriodo
      : sinSeleccion);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Tag className="h-4 w-4" />
            </span>
            Aplicar estado a despachos
          </DialogTitle>
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
              onClick={() => onModoChange('periodo')}
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
              aria-selected={modo === 'despachos'}
              onClick={() => onModoChange('despachos')}
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-1.5 transition-colors',
                modo === 'despachos'
                  ? 'bg-background font-medium text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <ListChecks className="h-4 w-4" />
              Por despachos
            </button>
          </div>

          <div className="rounded-md border border-border bg-[var(--color-muted)]/40 p-3 text-xs text-muted-foreground">
            {modo === 'periodo' ? (
              <>
                Se aplicará el estado seleccionado a todos los paquetes de los despachos
                cuya fecha esté dentro del rango indicado.
              </>
            ) : (
              <>
                Se aplicará el estado seleccionado a todos los paquetes de los despachos
                seleccionados (uno o varios).
              </>
            )}{' '}
            Solo se listan estados <span className="font-medium text-foreground">posteriores</span>{' '}
            al estado del punto de despacho.
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="aplicar-estado-select"
              className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Estado a aplicar
            </label>
            {estadosAplicables.length === 0 ? (
              <div className="rounded-md border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
                No hay estados posteriores al estado del punto de despacho. Configura
                el orden de estados en{' '}
                <span className="font-medium">Parámetros del sistema</span>.
              </div>
            ) : (
              <Select
                value={estadoRastreoSeleccionado != null ? String(estadoRastreoSeleccionado) : ''}
                onValueChange={(v) => onEstadoRastreoChange(v ? Number(v) : null)}
              >
                <SelectTrigger id="aplicar-estado-select" className="h-9 w-full">
                  <SelectValue placeholder="Selecciona un estado..." />
                </SelectTrigger>
                <SelectContent>
                  {estadosAplicables.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      <span className="inline-flex items-center gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">
                          #{e.ordenTracking}
                        </span>
                        <span>{e.nombre}</span>
                        {defaultEstadoId === e.id && (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Por defecto
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {modo === 'periodo' ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Atajos
                </span>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => aplicarPreset('hoy')}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Hoy
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => aplicarPreset('7d')}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Últimos 7 días
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={() => aplicarPreset('mes')}
                  >
                    <CalendarClock className="h-3.5 w-3.5" />
                    Este mes
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label
                    className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                    htmlFor="periodo-desde"
                  >
                    Fecha inicio
                  </label>
                  <Input
                    id="periodo-desde"
                    type="date"
                    value={fechaInicio}
                    max={hoy}
                    onChange={(e) => onFechaInicioChange(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label
                    className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                    htmlFor="periodo-hasta"
                  >
                    Fecha fin
                  </label>
                  <Input
                    id="periodo-hasta"
                    type="date"
                    value={fechaFin}
                    min={fechaInicio || undefined}
                    max={hoy}
                    onChange={(e) => onFechaFinChange(e.target.value)}
                  />
                </div>
              </div>

              {rangoCompleto && (
                <div
                  className={cn(
                    'rounded-md border p-3 text-sm',
                    rangoInvalido
                      ? 'border-[var(--color-destructive)]/40 bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]'
                      : sinDespachosPeriodo
                        ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                        : 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]',
                  )}
                >
                  {rangoInvalido ? (
                    <span>
                      La fecha de inicio debe ser anterior o igual a la fecha de fin.
                    </span>
                  ) : sinDespachosPeriodo ? (
                    <span>No hay despachos en el periodo seleccionado.</span>
                  ) : (
                    <span>
                      <span className="font-semibold">
                        {despachosEnPeriodo?.count}
                      </span>{' '}
                      despacho{despachosEnPeriodo?.count === 1 ? '' : 's'} se
                      actualizar
                      {despachosEnPeriodo?.count === 1 ? 'á' : 'án'} con sus paquetes
                      asociados.
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por #, guía, distribuidor, destinatario..."
                    className="h-9 pl-8"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5"
                    onClick={toggleTodosVisibles}
                    disabled={despachosFiltrados.length === 0}
                  >
                    {todosVisiblesSeleccionados ? (
                      <>
                        <Square className="h-3.5 w-3.5" />
                        Quitar visibles
                      </>
                    ) : (
                      <>
                        <CheckSquare className="h-3.5 w-3.5" />
                        Marcar visibles
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={limpiarSeleccion}
                    disabled={sinSeleccion}
                  >
                    Limpiar
                  </Button>
                </div>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                {despachosFiltrados.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay despachos que coincidan.
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {despachosFiltrados.map((d) => {
                      const checked = seleccionados.has(d.id);
                      const f = d.fechaHora ? new Date(d.fechaHora) : null;
                      const valido = f && !Number.isNaN(f.getTime());
                      return (
                        <li key={d.id}>
                          <label
                            className={cn(
                              'flex cursor-pointer items-start gap-3 px-3 py-2 text-sm transition-colors',
                              checked
                                ? 'bg-primary/5'
                                : 'hover:bg-[var(--color-muted)]/40',
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleDespacho(d.id)}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-baseline gap-x-2">
                                <MonoTrunc
                                  value={d.numeroGuia}
                                  className="font-medium text-foreground"
                                  copy={false}
                                />
                                <span className="font-mono text-[11px] text-muted-foreground">
                                  #{d.id}
                                </span>
                                {valido && (
                                  <span className="text-[11px] text-muted-foreground">
                                    {f!.toLocaleDateString('es-EC', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                )}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                {d.distribuidorNombre && (
                                  <span className="truncate">
                                    {d.distribuidorNombre}
                                  </span>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`${TIPO_COLORS[d.tipoEntrega]} font-normal`}
                                >
                                  {TIPO_LABELS[d.tipoEntrega] ?? d.tipoEntrega}
                                </Badge>
                                <span>
                                  {d.sacaIds?.length ?? 0} saca
                                  {(d.sacaIds?.length ?? 0) === 1 ? '' : 's'}
                                </span>
                              </div>
                            </div>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div
                className={cn(
                  'rounded-md border p-3 text-sm',
                  sinSeleccion
                    ? 'border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
                    : 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]',
                )}
              >
                {sinSeleccion ? (
                  <span>Selecciona al menos un despacho.</span>
                ) : (
                  <span>
                    <span className="font-semibold">
                      {despachosSeleccionados.length}
                    </span>{' '}
                    despacho{despachosSeleccionados.length === 1 ? '' : 's'}{' '}
                    seleccionado
                    {despachosSeleccionados.length === 1 ? '' : 's'} se actualizar
                    {despachosSeleccionados.length === 1 ? 'á' : 'án'}.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 pt-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmDeshabilitado}
            className="gap-2"
          >
            <Tag className="h-4 w-4" />
            {loading ? 'Aplicando...' : 'Aplicar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function SacasBadge({ total }: { total: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Badge
        className={
          total > 0
            ? 'bg-primary/10 text-primary hover:bg-primary/15'
            : 'bg-[var(--color-muted)] text-muted-foreground hover:bg-[var(--color-muted)]'
        }
      >
        <PackageIcon className="mr-1 h-3 w-3" />
        {total}
      </Badge>
      <span className="text-xs text-muted-foreground">
        saca{total === 1 ? '' : 's'}
      </span>
    </div>
  );
}

interface WhatsAppDespachoDialogProps {
  despacho: Despacho | null;
  onClose: () => void;
}

/**
 * Normaliza un teléfono al formato esperado por wa.me:
 * - elimina cualquier carácter que no sea dígito
 * - si empieza por "0" y tiene 10 dígitos asume Ecuador (+593) y lo prefija
 * - si tiene 9 dígitos asume Ecuador sin el 0 inicial y prefija 593
 * - si ya empieza por "593" lo deja
 */
function normalizarTelefonoWA(raw: string | null | undefined): {
  ok: boolean;
  digits: string;
  display: string;
} {
  const digits = (raw ?? '').replace(/\D+/g, '');
  if (!digits) return { ok: false, digits: '', display: '' };
  let normalized = digits;
  if (digits.startsWith('593')) {
    normalized = digits;
  } else if (digits.startsWith('0') && digits.length === 10) {
    normalized = `593${digits.slice(1)}`;
  } else if (digits.length === 9) {
    normalized = `593${digits}`;
  }
  const display = `+${normalized}`.replace(
    /^\+(\d{3})(\d{2})(\d{3})(\d+)$/,
    '+$1 $2 $3 $4',
  );
  return { ok: normalized.length >= 10, digits: normalized, display };
}

function WhatsAppDespachoDialog({ despacho, onClose }: WhatsAppDespachoDialogProps) {
  const open = despacho != null;
  const despachoId = despacho?.id;
  const { data, isLoading, isFetching, refetch } = useMensajeWhatsAppDespachoGenerado(
    despachoId ?? 0,
    open,
  );

  const original = data?.mensaje ?? '';

  const [editar, setEditar] = useState(false);
  const [texto, setTexto] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    if (open) {
      setTexto(original);
      setEditar(false);
      setCopiado(false);
    }
  }, [open, despachoId, original]);

  if (!despacho) return null;

  const telefono = despacho.destinatarioTelefono;
  const wa = normalizarTelefonoWA(telefono);

  const mensaje = (texto ?? '').trim();
  const cargando = isLoading || (isFetching && !data);
  const sinPlantilla = !cargando && !original.trim();
  const dirty = texto !== original;
  const charCount = mensaje.length;
  const waUrl = wa.ok
    ? `https://wa.me/${wa.digits}?text=${encodeURIComponent(mensaje)}`
    : null;
  const puedeCompartir =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleCopy = async () => {
    if (!mensaje) return;
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopiado(true);
      toast.success('Mensaje copiado');
      window.setTimeout(() => setCopiado(false), 1800);
    } catch {
      toast.error('No se pudo copiar el mensaje');
    }
  };

  const handleShare = async () => {
    if (!mensaje) return;
    try {
      await navigator.share({
        title: `Despacho ${despacho.numeroGuia}`,
        text: mensaje,
      });
    } catch {
      // Ignorar: usuario canceló o no soportado
    }
  };

  const handleReset = () => {
    setTexto(original);
    setEditar(false);
    setCopiado(false);
  };

  const handleRegenerar = () => {
    void refetch();
    setCopiado(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--color-success)]/10 text-[var(--color-success)]">
              <MessageCircle className="h-4 w-4" />
            </span>
            Mensaje WhatsApp
            <Badge
              variant="outline"
              className="ml-1 font-mono text-[11px] font-normal text-muted-foreground"
            >
              #{despacho.id}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {cargando ? (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando mensaje...
            </div>
          ) : sinPlantilla ? (
            <div className="rounded-lg border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-3 text-sm text-[var(--color-warning)]">
              <p className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Aún no hay plantilla configurada. Configúrala en{' '}
                  <span className="font-medium">Parámetros del sistema</span>.
                </span>
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {editar ? 'Editar mensaje' : 'Vista previa'}
                </span>
                <div className="flex items-center gap-2">
                  {dirty && !editar && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 px-2 py-0.5 text-[10px] font-medium text-[var(--color-warning)]">
                      Editado
                    </span>
                  )}
                  <Button
                    type="button"
                    variant={editar ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 gap-1.5 px-2"
                    onClick={() => setEditar((v) => !v)}
                  >
                    {editar ? (
                      <>
                        <Eye className="h-3.5 w-3.5" />
                        Vista previa
                      </>
                    ) : (
                      <>
                        <Settings2 className="h-3.5 w-3.5" />
                        Personalizar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {editar ? (
                <Textarea
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  rows={9}
                  className="resize-y font-sans text-sm"
                  placeholder="Escribe el mensaje..."
                />
              ) : (
                <div className="rounded-2xl border border-[var(--color-success)]/20 bg-[color-mix(in_oklab,var(--color-success)_8%,transparent)] p-3">
                  <div className="relative max-h-[280px] overflow-auto whitespace-pre-wrap rounded-xl rounded-tl-sm border border-border bg-[var(--color-card)] p-3 text-sm leading-relaxed text-foreground shadow-sm">
                    {mensaje || (
                      <span className="italic text-muted-foreground">
                        Mensaje vacío
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  {charCount} carácter{charCount === 1 ? '' : 'es'}
                </span>
                {dirty && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-1 rounded text-muted-foreground hover:text-foreground"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restablecer
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse items-stretch justify-between gap-2 pt-2 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegenerar}
              disabled={cargando}
              className="gap-2"
            >
              <RotateCcw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
              Regenerar
            </Button>
            {puedeCompartir && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleShare}
                disabled={!mensaje}
                className="gap-2"
              >
                <Share2 className="h-4 w-4" />
                Compartir
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!mensaje}
              className={cn('gap-2', copiado && 'border-[var(--color-success)]/30 text-[var(--color-success)]')}
            >
              {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiado ? 'Copiado' : 'Copiar'}
            </Button>
            {waUrl ? (
              <Button
                asChild
                size="sm"
                className={cn(
                  'gap-2 bg-[var(--color-success)] text-white shadow-sm transition-colors hover:bg-[var(--color-success)] hover:brightness-110',
                  !mensaje && 'pointer-events-none opacity-50',
                )}
              >
                <a href={waUrl} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="h-4 w-4" />
                  Abrir en WhatsApp
                </a>
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled
                title={
                  telefono
                    ? 'Teléfono no válido para WhatsApp'
                    : 'Sin teléfono registrado'
                }
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                Abrir en WhatsApp
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
