import { Link, useParams } from '@tanstack/react-router';
import { useDespacho } from '@/hooks/useOperarioDespachos';
import { LoadingState } from '@/components/LoadingState';
import { Button } from '@/components/ui/button';
import { ListTableShell } from '@/components/ListTableShell';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileDown, Pencil, Printer } from 'lucide-react';
import type { TamanioSaca } from '@/types/despacho';
import { buildDespachoPdf } from '@/lib/pdf/builders/despachoPdf';
import { runJsPdfAction } from '@/lib/pdf/actions';

const TAMANIO_LABELS: Record<TamanioSaca, string> = {
  INDIVIDUAL: 'Paquete individual',
  PEQUENO: 'Saca pequeña',
  MEDIANO: 'Saca mediana',
  GRANDE: 'Saca grande',
};

function formatFechaHora(s: string | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString('es-EC', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return s;
  }
}

function formatPeso(lbs?: number, kg?: number): string {
  return [
    lbs != null ? `${lbs} lbs` : null,
    kg != null ? `${kg} kg` : null,
  ].filter(Boolean).join(' / ') || '—';
}

export function DespachoDetailPage() {
  const params = useParams({ strict: false });
  const id = params.id != null ? Number(params.id) : NaN;
  const { data: despacho, isLoading, error } = useDespacho(Number.isNaN(id) ? undefined : id);

  if (Number.isNaN(id)) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        ID de despacho no válido.
        <Link to="/despachos" className="ml-2 underline">Volver a despachos</Link>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState text="Cargando despacho..." />;
  }
  if (error || !despacho) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        No se pudo cargar el despacho.
        <Link to="/despachos" className="ml-2 underline">Volver a despachos</Link>
      </div>
    );
  }

  const d = despacho;
  const totalSacas = d.sacas?.length ?? 0;
  const totalPaquetes = (d.sacas ?? []).reduce((sum, s) => sum + (s.paquetes?.length ?? 0), 0);
  const totalPeso = (d.sacas ?? []).reduce((sum, s) => sum + Number(s.pesoLbs ?? 0), 0);
  const destino =
    d.tipoEntrega === 'DOMICILIO'
      ? d.destinatarioNombre ?? '—'
      : d.tipoEntrega === 'AGENCIA_DISTRIBUIDOR'
        ? d.agenciaDistribuidorNombre ?? '—'
        : d.agenciaNombre ?? '—';
  const destinoDireccion =
    d.tipoEntrega === 'DOMICILIO'
      ? d.destinatarioDireccion ?? '—'
      : d.tipoEntrega === 'AGENCIA_DISTRIBUIDOR'
        ? d.agenciaDistribuidorNombre ?? '—'
        : d.agenciaNombre ?? '—';

  async function handlePdfDespacho(mode: 'download' | 'print') {
    const doc = buildDespachoPdf(d);
    runJsPdfAction(doc, { mode, filename: `despacho-${d.id}.pdf` });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link to="/despachos">
            <Button variant="ghost" size="icon" aria-label="Volver a despachos">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              {d.numeroGuia}
            </h1>
            <div className="flex items-center gap-2">
              <p className="text-sm text-[var(--color-muted-foreground)]">ID: {d.id}</p>
              <Badge variant="secondary">Activo</Badge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/despachos/$id/editar" params={{ id: String(d.id) }}>
            <Button variant="outline" className="gap-2">
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
          </Link>
          <Button onClick={() => handlePdfDespacho('print')} className="gap-2">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" onClick={() => handlePdfDespacho('download')} className="gap-2">
            <FileDown className="h-4 w-4" />
            Descargar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="surface-card p-4 xl:col-span-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Información general
          </h2>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Guía</span>
              <span className="font-medium">{d.numeroGuia}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Fecha despacho</span>
              <span>{formatFechaHora(d.fechaHora)}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Distribuidor</span>
              <span>{d.distribuidorNombre ?? '—'}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Tipo entrega</span>
              <span>{d.tipoEntrega}</span>
            </div>
          </div>
        </section>

        <section className="surface-card p-4 xl:col-span-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Contacto y ubicación
          </h2>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Destino</span>
              <span className="font-medium">{destino}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Teléfono</span>
              <span>{d.destinatarioTelefono ?? '—'}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Dirección</span>
              <span>{destinoDireccion}</span>
            </div>
          </div>
        </section>

        <section className="surface-card p-4 xl:col-span-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Resumen
          </h2>
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-center">
              <p className="text-xl font-semibold">{totalSacas}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Sacas</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-center">
              <p className="text-xl font-semibold">{totalPaquetes}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Paquetes</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-center">
              <p className="text-xl font-semibold">{totalPeso.toFixed(1)}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Peso lbs</p>
            </div>
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
          Sacas asociadas {totalSacas}
        </h3>
        {totalSacas > 0 ? (
          <div className="space-y-4">
            {d.sacas?.map((saca, idx) => (
              <div key={saca.id} className="surface-card overflow-hidden p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">
                      {idx + 1}. {saca.numeroOrden}
                    </p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      Tamaño: {saca.tamanio ? (TAMANIO_LABELS[saca.tamanio] ?? saca.tamanio) : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{saca.paquetes?.length ?? 0} paquete(s)</Badge>
                    <Badge variant="outline">{formatPeso(saca.pesoLbs, saca.pesoKg)}</Badge>
                  </div>
                </div>

                {saca.paquetes && saca.paquetes.length > 0 ? (
                  <ListTableShell>
                    <table className="compact-table min-w-[1100px]">
                      <thead>
                        <tr>
                          <th>Guía</th>
                          <th>Ref</th>
                          <th>Destinatario</th>
                          <th>Teléfono</th>
                          <th>Provincia / Cantón</th>
                          <th>Dirección</th>
                          <th>Contenido</th>
                          <th>Estado</th>
                          <th className="text-right">Peso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {saca.paquetes.map((p) => (
                          <tr key={p.id}>
                            <td className="font-medium">{p.numeroGuia}</td>
                            <td>{p.ref ?? '—'}</td>
                            <td>{p.destinatarioNombre ?? '—'}</td>
                            <td>{p.destinatarioTelefono ?? '—'}</td>
                            <td>{[p.destinatarioProvincia, p.destinatarioCanton].filter(Boolean).join(' / ') || '—'}</td>
                            <td className="max-w-[220px] truncate" title={p.destinatarioDireccion ?? ''}>
                              {p.destinatarioDireccion ?? '—'}
                            </td>
                            <td className="max-w-[200px] truncate" title={p.contenido ?? ''}>
                              {p.contenido ?? '—'}
                            </td>
                            <td>{p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}</td>
                            <td className="text-right">{formatPeso(p.pesoLbs, p.pesoKg)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ListTableShell>
                ) : (
                  <div className="px-4 py-3 text-sm text-[var(--color-muted-foreground)]">
                    Esta saca no tiene paquetes asociados.
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="surface-card p-4 text-sm text-[var(--color-muted-foreground)]">
            Este despacho no tiene sacas asignadas.
          </div>
        )}
      </section>

    </div>
  );
}
