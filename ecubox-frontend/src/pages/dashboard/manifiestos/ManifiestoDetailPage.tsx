import { useState } from 'react';
import { Link, useParams } from '@tanstack/react-router';
import {
  useManifiesto,
  useRecalcularTotales,
  useAsignarDespachos,
  useCambiarEstadoManifiesto,
  useDespachosCandidatosManifiesto,
} from '@/hooks/useManifiestos';
import { useAgencias } from '@/hooks/useAgencias';
import { useDistribuidoresAdmin } from '@/hooks/useDistribuidoresAdmin';
import { LoadingState } from '@/components/LoadingState';
import { ListTableShell } from '@/components/ListTableShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Calculator, Truck, PlusCircle, FileDown, Printer } from 'lucide-react';
import type { EstadoManifiesto } from '@/types/manifiesto';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { buildManifiestoPdf } from '@/lib/pdf/builders/manifiestoPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';

export function ManifiestoDetailPage() {
  const params = useParams({ strict: false });
  const id = params.id != null ? Number(params.id) : NaN;
  const { data: manifiesto, isLoading, error } = useManifiesto(Number.isNaN(id) ? null : id);
  const { data: despachosCandidatos = [] } = useDespachosCandidatosManifiesto(Number.isNaN(id) ? null : id);
  const { data: agencias = [] } = useAgencias();
  const { data: distribuidores = [] } = useDistribuidoresAdmin();
  const recalcular = useRecalcularTotales();
  const asignarDespachos = useAsignarDespachos();
  const cambiarEstado = useCambiarEstadoManifiesto();
  const [asignarOpen, setAsignarOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [pdfAgenciaId, setPdfAgenciaId] = useState<number>(0);
  const [pdfDistribuidorId, setPdfDistribuidorId] = useState<number>(0);

  if (Number.isNaN(id)) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        ID de manifiesto no válido.
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState text="Cargando m..." />;
  }
  if (error || !manifiesto) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        No se pudo cargar el m.
      </div>
    );
  }

  const m = manifiesto;
  const despachos = m.despachos ?? [];
  const yaAsignados = new Set(despachos.map((d) => d.id));

  function handleRecalcular() {
    recalcular.mutate(m.id);
  }

  function handleAsignar() {
    asignarDespachos.mutate(
      { id: m.id, body: { despachoIds: selectedIds } },
      {
        onSuccess: () => {
          setAsignarOpen(false);
          setSelectedIds([]);
        },
      }
    );
  }

  function handleCambiarEstado(estado: EstadoManifiesto) {
    cambiarEstado.mutate({ id: m.id, estado });
  }

  function handlePdfManifiesto(mode: 'download' | 'print') {
    const distribuidorSeleccionado = distribuidores.find((d) => d.id === pdfDistribuidorId);
    const agenciaSeleccionada = agencias.find((a) => a.id === pdfAgenciaId);

    const despachosFiltrados = despachos.filter((d) => {
      const matchDistribuidor = !distribuidorSeleccionado || d.distribuidorNombre === distribuidorSeleccionado.nombre;
      const matchAgencia = !agenciaSeleccionada || d.agenciaNombre === agenciaSeleccionada.nombre;
      return matchDistribuidor && matchAgencia;
    });

    const doc = buildManifiestoPdf({
      manifiesto: m,
      despachos: despachosFiltrados,
      filtroAgenciaNombre: agenciaSeleccionada?.nombre,
      filtroDistribuidorNombre: distribuidorSeleccionado?.nombre,
    });
    runJsPdfAction(doc, { mode, filename: `manifiesto-${m.id}.pdf` });
  }

  function toggleDespacho(despachoId: number) {
    setSelectedIds((prev) =>
      prev.includes(despachoId)
        ? prev.filter((x) => x !== despachoId)
        : [...prev, despachoId]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link to="/manifiestos">
            <Button variant="ghost" size="icon" aria-label="Volver">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">{m.codigo}</h1>
            <div className="mt-1 flex items-center gap-2">
              <p className="text-sm text-[var(--color-muted-foreground)]">ID: {m.id}</p>
              <Badge variant="secondary">{m.estado ?? 'PENDIENTE'}</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAsignarOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Agregar despachos
          </Button>
          <Button variant="outline" onClick={handleRecalcular} disabled={recalcular.isPending}>
            <Calculator className="mr-2 h-4 w-4" />
            {recalcular.isPending ? 'Recalculando...' : 'Recalcular'}
          </Button>
          <Button variant="outline" onClick={() => handlePdfManifiesto('print')}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="destructive" onClick={() => handlePdfManifiesto('download')}>
            <FileDown className="mr-2 h-4 w-4" />
            Descargar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="surface-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Información básica</h2>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[130px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Periodo</span>
              <span>{m.fechaInicio} – {m.fechaFin}</span>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Estado</span>
              <select
                value={m.estado}
                onChange={(e) => handleCambiarEstado(e.target.value as EstadoManifiesto)}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-sm"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="PAGADO">Pagado</option>
                <option value="ANULADO">Anulado</option>
              </select>
            </div>
            <div className="grid grid-cols-[130px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Filtro</span>
              <span>
                {m.filtroTipo === 'POR_PERIODO'
                  ? 'Por período'
                  : m.filtroTipo === 'POR_DISTRIBUIDOR'
                    ? m.filtroDistribuidorNombre ?? '—'
                    : m.filtroAgenciaNombre ?? '—'}
              </span>
            </div>
          </div>
        </section>

        <section className="surface-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Exportación PDF</h2>
          <div className="space-y-2">
            <select
              value={pdfDistribuidorId}
              onChange={(e) => setPdfDistribuidorId(Number(e.target.value))}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-2 text-sm"
            >
              <option value={0}>Todos los distribuidores</option>
              {distribuidores.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.codigo})
                </option>
              ))}
            </select>
            <select
              value={pdfAgenciaId}
              onChange={(e) => setPdfAgenciaId(Number(e.target.value))}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-2 text-sm"
            >
              <option value={0}>Todas las agencias</option>
              {agencias.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.codigo})
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="surface-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Resumen</h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-center">
              <p className="text-xl font-semibold">{m.cantidadDespachos ?? 0}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Despachos</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-center">
              <p className="text-xl font-semibold">{m.totalDistribuidor != null ? Number(m.totalDistribuidor).toFixed(2) : '—'}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Distribuidor</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-center">
              <p className="text-xl font-semibold">{m.totalPagar != null ? Number(m.totalPagar).toFixed(2) : '—'}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Total</p>
            </div>
          </div>
        </section>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--color-foreground)] flex items-center gap-2">
          <Truck className="h-4 w-4" />
          Despachos en este manifiesto
        </h2>
        {despachos.length === 0 ? (
          <div className="surface-card p-4 text-sm text-[var(--color-muted-foreground)]">
            No hay despachos asignados. Usa &quot;Asignar despachos&quot; para agregar.
          </div>
        ) : (
          <ListTableShell>
            <table className="compact-table min-w-[780px]">
              <thead>
                <tr>
                  <th>Guía</th>
                  <th>Distribuidor</th>
                  <th>Tipo</th>
                  <th>Agencia</th>
                  <th>Destinatario</th>
                </tr>
              </thead>
              <tbody>
                {despachos.map((d) => (
                  <tr key={d.id}>
                    <td className="font-medium">{d.numeroGuia}</td>
                    <td>{d.distribuidorNombre ?? '—'}</td>
                    <td>{d.tipoEntrega ?? '—'}</td>
                    <td>{d.agenciaNombre ?? '—'}</td>
                    <td>{d.destinatarioNombre ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ListTableShell>
        )}
      </div>

      <Dialog open={asignarOpen} onOpenChange={setAsignarOpen}>
        <DialogContent className="max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Asignar despachos al manifiesto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Selecciona manualmente los despachos sugeridos por período/filtros para construir el manifiesto.
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto rounded border border-[var(--color-border)] p-2">
            {despachosCandidatos.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                No hay despachos disponibles.
              </p>
            ) : (
              <div className="space-y-3">
                {despachosCandidatos.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-medium text-[var(--color-muted-foreground)]">Sugeridos por período/filtros</p>
                    <ul className="space-y-1">
                      {despachosCandidatos.map((d) => (
                        <li key={`cand-${d.id}`} className="flex items-center gap-2">
                          <Checkbox
                            id={`desp-cand-${d.id}`}
                            checked={selectedIds.includes(d.id) || yaAsignados.has(d.id)}
                            disabled={yaAsignados.has(d.id)}
                            onCheckedChange={() => !yaAsignados.has(d.id) && toggleDespacho(d.id)}
                          />
                          <label
                            htmlFor={`desp-cand-${d.id}`}
                            className={yaAsignados.has(d.id) ? 'text-[var(--color-muted-foreground)]' : ''}
                          >
                            {d.numeroGuia} – {d.distribuidorNombre ?? '—'} ({d.tipoEntrega ?? '—'})
                            {yaAsignados.has(d.id) && ' (ya en este manifiesto)'}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setAsignarOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAsignar}
              disabled={selectedIds.length === 0 || asignarDespachos.isPending}
            >
              {asignarDespachos.isPending ? 'Asignando...' : 'Asignar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
