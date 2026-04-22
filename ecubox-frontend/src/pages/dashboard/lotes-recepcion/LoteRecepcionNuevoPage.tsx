import { useMemo, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCreateLoteRecepcion } from '@/hooks/useLotesRecepcion';
import { useEnviosDisponiblesParaRecepcion } from '@/hooks/useEnviosConsolidados';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  ArrowLeft,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  FileText,
  Info,
  PackageCheck,
  Plus,
  Search,
  Trash2,
  Truck,
} from 'lucide-react';
import { localDateTimeInputToApi } from '@/lib/datetime-local';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { EnvioConsolidado } from '@/types/envio-consolidado';

function defaultFechaRecepcion(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LoteRecepcionNuevoPage() {
  const navigate = useNavigate();
  const createMutation = useCreateLoteRecepcion();
  const [fechaRecepcion, setFechaRecepcion] = useState(defaultFechaRecepcion);
  const [observaciones, setObservaciones] = useState('');
  const [seleccionados, setSeleccionados] = useState<EnvioConsolidado[]>([]);
  const [comboValue, setComboValue] = useState<number | undefined>(undefined);
  const [bulkText, setBulkText] = useState('');
  const [modo, setModo] = useState<'buscar' | 'lista'>('buscar');

  // El endpoint `disponibles-recepcion` devuelve ya filtrados los envios que
  // (a) tienen al menos un paquete y (b) no estan en otro lote. Es ortogonal
  // al estado administrativo (cerrado / pagado) porque la recepcion fisica
  // ocurre cuando llegan a Ecuador, sin importar si ya estan liquidados.
  const { data: enviosResp, isLoading: loadingEnvios } = useEnviosDisponiblesParaRecepcion({
    size: 200,
  });
  const envios = enviosResp?.content ?? [];

  const opcionesDisponibles = useMemo(
    () => envios.filter((e) => !seleccionados.some((s) => s.id === e.id)),
    [envios, seleccionados],
  );

  const stats = useMemo(() => {
    const totalPaquetes = seleccionados.reduce(
      (acc, e) => acc + (e.totalPaquetes ?? 0),
      0,
    );
    const totalPesoLbs = seleccionados.reduce(
      (acc, e) => acc + (e.pesoTotalLbs ?? 0),
      0,
    );
    return { totalPaquetes, totalPesoLbs };
  }, [seleccionados]);

  const agregarPorId = (id: number | undefined) => {
    if (id == null) return;
    const env = envios.find((e) => e.id === id);
    if (!env) return;
    if (seleccionados.some((s) => s.id === env.id)) return;
    setSeleccionados((prev) => [...prev, env]);
    setComboValue(undefined);
  };

  const quitar = (id: number) => {
    setSeleccionados((prev) => prev.filter((s) => s.id !== id));
  };

  /**
   * Procesa el textarea: separa por saltos de línea, comas, punto y coma o
   * espacios; deduplica; resuelve cada código contra los envíos cargados; y
   * agrega los encontrados a la selección. Reporta agregados, duplicados,
   * sin paquetes y desconocidos.
   */
  const agregarLista = () => {
    const tokens = bulkText
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      toast.error('Pega o escribe al menos un código.');
      return;
    }
    const dedup = Array.from(new Set(tokens.map((t) => t.toUpperCase())));

    const yaSeleccionadosSet = new Set(
      seleccionados.map((s) => s.codigo.toUpperCase()),
    );
    // Indexamos contra TODOS los envios cargados (incluyendo los sin paquetes)
    // para poder distinguir entre "no existe" y "existe pero esta vacio" en
    // los toasts de feedback. La seleccion final solo agrega los que tienen
    // paquetes, igual que el combobox.
    const enviosPorCodigo = new Map(
      envios.map((e) => [e.codigo.toUpperCase(), e]),
    );

    const nuevos: EnvioConsolidado[] = [];
    const duplicados: string[] = [];
    const desconocidos: string[] = [];

    for (const codigoUpper of dedup) {
      if (yaSeleccionadosSet.has(codigoUpper)) {
        duplicados.push(codigoUpper);
        continue;
      }
      const env = enviosPorCodigo.get(codigoUpper);
      if (!env) {
        desconocidos.push(codigoUpper);
        continue;
      }
      nuevos.push(env);
      yaSeleccionadosSet.add(codigoUpper);
    }

    if (nuevos.length > 0) {
      setSeleccionados((prev) => [...prev, ...nuevos]);
      toast.success(
        `${nuevos.length} envío${nuevos.length === 1 ? '' : 's'} agregado${nuevos.length === 1 ? '' : 's'}.`,
      );
    }
    if (duplicados.length > 0) {
      toast.message(
        `${duplicados.length} ya estaba${duplicados.length === 1 ? '' : 'n'} en la lista`,
        { description: duplicados.slice(0, 5).join(', ') + (duplicados.length > 5 ? '...' : '') },
      );
    }
    if (desconocidos.length > 0) {
      toast.error(
        `${desconocidos.length} código${desconocidos.length === 1 ? '' : 's'} no disponible${desconocidos.length === 1 ? '' : 's'}`,
        {
          description:
            desconocidos.slice(0, 5).join(', ') +
            (desconocidos.length > 5 ? '...' : '') +
            ' · No existen, no tienen paquetes o ya fueron recibidos en otro lote.',
        },
      );
    }

    const restantes = desconocidos;
    setBulkText(restantes.join('\n'));
  };

  const handleRegistrar = () => {
    if (seleccionados.length === 0) {
      toast.error('Selecciona al menos un envío consolidado.');
      return;
    }
    const numeroGuiasEnvio = seleccionados.map((e) => e.codigo);
    const fecha = localDateTimeInputToApi(fechaRecepcion);
    createMutation.mutate(
      {
        fechaRecepcion: fecha,
        observaciones: observaciones.trim() || undefined,
        numeroGuiasEnvio,
      },
      {
        onSuccess: (data) => {
          const codigosRegistrados = data.numeroGuiasEnvio?.length ?? 0;
          toast.success(
            `Lote registrado con ${codigosRegistrados} envío${codigosRegistrados === 1 ? '' : 's'} (${data.totalPaquetes ?? 0} paquete${(data.totalPaquetes ?? 0) === 1 ? '' : 's'}).`,
          );
          navigate({ to: '/lotes-recepcion/$id', params: { id: String(data.id) } });
        },
        onError: () => {
          toast.error('No se pudo registrar el lote.');
        },
      },
    );
  };

  const fechaLabel = useMemo(() => {
    if (!fechaRecepcion) return '';
    try {
      return new Date(fechaRecepcion).toLocaleString('es-EC', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    } catch {
      return fechaRecepcion;
    }
  }, [fechaRecepcion]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link to="/lotes-recepcion">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Volver a lotes de recepción"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
              Registrar nuevo lote de recepción
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Marca como recibidos todos los paquetes asociados a uno o varios
              envíos consolidados. Se listan tanto envíos abiertos como
              cerrados (incluso ya liquidados): la recepción física en bodega
              es independiente del estado administrativo.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr,1fr]">
        <div className="space-y-6">
          <section className="rounded-lg border border-border bg-card p-5">
            <header className="mb-4 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Datos del lote
              </h2>
            </header>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label
                  htmlFor="fecha-recepcion"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Fecha de recepción
                </label>
                <input
                  id="fecha-recepcion"
                  type="datetime-local"
                  value={fechaRecepcion}
                  onChange={(e) => setFechaRecepcion(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                {fechaLabel && (
                  <p className="text-xs text-muted-foreground">{fechaLabel}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <label
                  htmlFor="observaciones"
                  className="text-xs font-medium text-muted-foreground"
                >
                  Observaciones (opcional)
                </label>
                <textarea
                  id="observaciones"
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  rows={3}
                  placeholder="Notas internas sobre el lote..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-5">
            <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">
                  Envíos consolidados a recibir
                </h2>
              </div>
              {/* Selector de modo: el operario puede ir y volver entre buscar
                  o pegar lista en cualquier momento, incluso despues de
                  haber agregado algunos. La seleccion se preserva. */}
              <div
                role="tablist"
                aria-label="Forma de agregar envíos"
                className="inline-flex items-center rounded-md border border-border bg-[var(--color-muted)]/40 p-0.5 text-xs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === 'buscar'}
                  onClick={() => setModo('buscar')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 font-medium transition-colors',
                    modo === 'buscar'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Search className="h-3.5 w-3.5" />
                  Buscar
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={modo === 'lista'}
                  onClick={() => setModo('lista')}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-[5px] px-3 py-1.5 font-medium transition-colors',
                    modo === 'lista'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <ClipboardList className="h-3.5 w-3.5" />
                  Pegar lista
                </button>
              </div>
            </header>

            {modo === 'buscar' ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Buscar y agregar por código de envío
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <SearchableCombobox<EnvioConsolidado>
                      value={comboValue}
                      onChange={(v) =>
                        setComboValue(typeof v === 'number' ? v : undefined)
                      }
                      options={opcionesDisponibles}
                      getKey={(o) => o.id}
                      getLabel={(o) => o.codigo}
                      getSearchText={(o) =>
                        `${o.codigo} ${o.totalPaquetes ?? 0} ${o.pesoTotalLbs ?? ''}`
                      }
                      placeholder={
                        loadingEnvios
                          ? 'Cargando envíos...'
                          : opcionesDisponibles.length === 0
                            ? 'No hay envíos pendientes de recepción'
                            : 'Buscar por código de envío consolidado'
                      }
                      searchPlaceholder="Escribe el código..."
                      emptyMessage="Sin envíos coincidentes"
                      disabled={loadingEnvios || opcionesDisponibles.length === 0}
                      renderOption={(o) => (
                        <div className="flex w-full items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-mono text-sm font-medium">
                              {o.codigo}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {o.totalPaquetes ?? 0} paquete
                              {o.totalPaquetes === 1 ? '' : 's'}
                              {o.pesoTotalLbs != null
                                ? ` · ${o.pesoTotalLbs.toFixed(2)} lbs`
                                : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {o.estadoPago === 'PAGADO' && (
                              <Badge className="bg-[var(--color-success)]/15 font-normal text-[var(--color-success)] hover:bg-[var(--color-success)]/20">
                                Pagado
                              </Badge>
                            )}
                            {o.cerrado ? (
                              <Badge variant="secondary" className="font-normal">
                                Cerrado
                              </Badge>
                            ) : (
                              <Badge className="bg-[var(--color-success)]/15 font-normal text-[var(--color-success)] hover:bg-[var(--color-success)]/20">
                                Abierto
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      renderSelected={(o) => (
                        <span className="font-mono text-sm">{o.codigo}</span>
                      )}
                      clearable={false}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={() => agregarPorId(comboValue)}
                    disabled={comboValue == null}
                    className="sm:w-auto"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se listan envíos con al menos un paquete que aún no fueron
                  recibidos en otro lote, sin importar si están abiertos,
                  cerrados o ya pagados. Si no aparece el código que buscas,
                  créalo o agrégale paquetes en{' '}
                  <Link
                    to="/envios-consolidados"
                    className="text-primary underline-offset-2 hover:underline"
                  >
                    Envíos consolidados
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Pegar varios códigos
                </label>
                <p className="text-xs text-muted-foreground">
                  Separa los códigos por líneas, espacios o comas. Se agregarán
                  los envíos con paquetes que aún no estén en otro lote, sin
                  importar si están cerrados o ya pagados.
                </p>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      agregarLista();
                    }
                  }}
                  rows={5}
                  placeholder={'EC-2025-001\nEC-2025-002\nEC-2025-003'}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs"
                  disabled={loadingEnvios}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
                      Ctrl
                    </kbd>{' '}
                    +{' '}
                    <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[10px]">
                      Enter
                    </kbd>{' '}
                    para agregar.
                  </span>
                  <div className="flex gap-2">
                    {bulkText.trim().length > 0 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setBulkText('')}
                        disabled={loadingEnvios}
                      >
                        Limpiar
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={agregarLista}
                      disabled={loadingEnvios || bulkText.trim().length === 0}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar lista
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Seleccionados
                </h3>
                <span className="text-xs text-muted-foreground">
                  {seleccionados.length} envío
                  {seleccionados.length === 1 ? '' : 's'}
                </span>
              </div>

              {seleccionados.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-[var(--color-muted)]/30 px-4 py-8 text-center">
                  <Boxes className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Aún no has agregado envíos al lote.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Usa el buscador de arriba para agregar el primero.
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {seleccionados.map((env) => (
                    <li
                      key={env.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                          <PackageCheck className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate font-mono text-sm font-medium">
                              {env.codigo}
                            </p>
                            {env.estadoPago === 'PAGADO' && (
                              <Badge className="bg-[var(--color-success)]/15 font-normal text-[var(--color-success)] hover:bg-[var(--color-success)]/20">
                                Pagado
                              </Badge>
                            )}
                            {env.cerrado && (
                              <Badge variant="secondary" className="font-normal">
                                Cerrado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {env.totalPaquetes ?? 0} paquete
                            {env.totalPaquetes === 1 ? '' : 's'}
                            {env.pesoTotalLbs != null
                              ? ` · ${env.pesoTotalLbs.toFixed(2)} lbs`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => quitar(env.id)}
                          aria-label={`Quitar envío ${env.codigo}`}
                          title="Quitar envío"
                          className="rounded-md border border-border bg-background p-1.5 text-muted-foreground transition-colors hover:border-[var(--color-destructive)]/40 hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

        </div>

        <aside className="space-y-4">
          <section className="rounded-lg border border-border bg-card p-5">
            <header className="mb-4 flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold text-foreground">
                Resumen del lote
              </h2>
            </header>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  Envíos
                </dt>
                <dd className="font-semibold tabular-nums">
                  {seleccionados.length}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <Boxes className="h-4 w-4" />
                  Paquetes a recibir
                </dt>
                <dd className="font-semibold tabular-nums">
                  {stats.totalPaquetes}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <PackageCheck className="h-4 w-4" />
                  Peso total
                </dt>
                <dd className="font-semibold tabular-nums">
                  {stats.totalPesoLbs > 0
                    ? `${stats.totalPesoLbs.toFixed(2)} lbs`
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="h-4 w-4" />
                  Fecha
                </dt>
                <dd className="text-right text-xs text-foreground">
                  {fechaLabel || '—'}
                </dd>
              </div>
            </dl>

            <div className="mt-5 rounded-md border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-3">
              <p className="flex items-start gap-2 text-xs text-[var(--color-success)] dark:text-[var(--color-success)]">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Al registrar, los paquetes se marcarán como{' '}
                  <strong>recibidos en bodega</strong> automáticamente.
                </span>
              </p>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <Button
                onClick={handleRegistrar}
                disabled={createMutation.isPending || seleccionados.length === 0}
                className="w-full"
              >
                {createMutation.isPending
                  ? 'Registrando...'
                  : stats.totalPaquetes > 0
                    ? `Registrar lote (${stats.totalPaquetes} paquete${stats.totalPaquetes === 1 ? '' : 's'})`
                    : 'Registrar lote'}
              </Button>
              <Link to="/lotes-recepcion" className="block">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={createMutation.isPending}
                >
                  Cancelar
                </Button>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
