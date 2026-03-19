import { Link, useParams } from '@tanstack/react-router';
import { useState, useCallback, useMemo } from 'react';
import { useLoteRecepcion, useAddGuiasToLoteRecepcion } from '@/hooks/useLotesRecepcion';
import { LoadingState } from '@/components/LoadingState';
import { ListTableShell } from '@/components/ListTableShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ArrowLeft, Plus } from 'lucide-react';
import { toast } from 'sonner';

function formatFecha(s: string | undefined): string {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return s;
    return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s;
  }
}

export function LoteRecepcionDetailPage() {
  const params = useParams({ strict: false });
  const id = params.id != null ? Number(params.id) : NaN;
  const { data: lote, isLoading, error } = useLoteRecepcion(Number.isNaN(id) ? undefined : id);
  const addGuias = useAddGuiasToLoteRecepcion(Number.isNaN(id) ? undefined : id);
  const [nuevasGuiasText, setNuevasGuiasText] = useState('');
  const [dialogAgregarGuiasOpen, setDialogAgregarGuiasOpen] = useState(false);

  const parseGuias = useCallback((text: string) => {
    return text
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }, []);

  const handleAgregarGuias = useCallback(async () => {
    const guias = parseGuias(nuevasGuiasText);
    if (guias.length === 0) {
      toast.error('Escribe al menos una guía de envío (una por línea).');
      return;
    }
    try {
      await addGuias.mutateAsync(guias);
      setNuevasGuiasText('');
      setDialogAgregarGuiasOpen(false);
      toast.success('Guías agregadas al lote. Solo se incluyeron las que tienen paquetes registrados.');
    } catch {
      toast.error('Error al agregar guías al lote.');
    }
  }, [nuevasGuiasText, parseGuias, addGuias]);

  const groupedPaquetes = useMemo(() => {
    const paquetes = lote?.paquetes ?? [];
    const norm = (v?: string | null) => (v ?? '').trim().toLowerCase();
    const clean = (v?: string | null, fallback = '—') => {
      const t = (v ?? '').trim();
      return t.length > 0 ? t : fallback;
    };
    const map = new Map<string, {
      key: string;
      destinatarioId: number;
      destinatario: string;
      provincia: string;
      canton: string;
      paquetes: typeof paquetes;
      pesoKg: number;
      pesoLbs: number;
    }>();

    for (const p of paquetes) {
      const destinatarioId = p.destinatarioFinalId ?? 0;
      const destinatario = clean(p.destinatarioNombre, 'Destinatario no identificado');
      const provincia = clean(p.destinatarioProvincia, 'Sin provincia');
      const canton = clean(p.destinatarioCanton, 'Sin cantón');
      const key = `${destinatarioId}__${norm(provincia)}__${norm(canton)}`;
      const current = map.get(key);
      if (!current) {
        map.set(key, {
          key,
          destinatarioId,
          destinatario,
          provincia,
          canton,
          paquetes: [p],
          pesoKg: Number(p.pesoKg ?? 0),
          pesoLbs: Number(p.pesoLbs ?? 0),
        });
      } else {
        current.paquetes.push(p);
        current.pesoKg += Number(p.pesoKg ?? 0);
        current.pesoLbs += Number(p.pesoLbs ?? 0);
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.provincia !== b.provincia) return a.provincia.localeCompare(b.provincia, 'es');
      if (a.canton !== b.canton) return a.canton.localeCompare(b.canton, 'es');
      return a.destinatario.localeCompare(b.destinatario, 'es');
    });
  }, [lote?.paquetes]);

  const copyGroupGuias = useCallback(async (group: { paquetes: Array<{ numeroGuia?: string }> }) => {
    const guias = Array.from(
      new Set(
        group.paquetes
          .map((p) => (p.numeroGuia ?? '').trim())
          .filter((g) => g.length > 0)
      )
    );
    if (guias.length === 0) {
      toast.error('Este grupo no tiene guías válidas para copiar.');
      return;
    }
    try {
      await navigator.clipboard.writeText(guias.join('\n'));
      toast.success(`Se copiaron ${guias.length} guía(s) al portapapeles.`);
    } catch {
      toast.error('No se pudo copiar al portapapeles.');
    }
  }, []);

  if (Number.isNaN(id)) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        ID de lote no válido.
        <Link to="/lotes-recepcion" className="ml-2 underline">
          Volver a lotes de recepción
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingState text="Cargando lote..." />;
  }
  if (error || !lote) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        No se pudo cargar el lote.
        <Link to="/lotes-recepcion" className="ml-2 underline">
          Volver a lotes de recepción
        </Link>
      </div>
    );
  }

  const l = lote;
  const totalGuias = l.numeroGuiasEnvio?.length ?? 0;
  const totalPaquetes = l.paquetes?.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Link to="/lotes-recepcion">
            <Button variant="ghost" size="icon" aria-label="Volver a lotes de recepción">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
              Lote recepción
            </h1>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">ID: {l.id}</p>
          </div>
        </div>
        <Button type="button" variant="outline" onClick={() => setDialogAgregarGuiasOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Agregar guías
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="surface-card p-4 xl:col-span-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Información básica
          </h2>
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Fecha</span>
              <span>{formatFecha(l.fechaRecepcion)}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Operario</span>
              <span>{l.operarioNombre ?? '—'}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr] gap-2">
              <span className="text-[var(--color-muted-foreground)]">Observaciones</span>
              <span className="whitespace-pre-wrap">{l.observaciones || '—'}</span>
            </div>
          </div>
        </section>

        <section className="surface-card p-4 xl:col-span-1">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Resumen
          </h2>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-center">
              <p className="text-xl font-semibold">{totalGuias}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Guías</p>
            </div>
            <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/40 p-3 text-center">
              <p className="text-xl font-semibold">{totalPaquetes}</p>
              <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted-foreground)]">Paquetes</p>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={dialogAgregarGuiasOpen} onOpenChange={setDialogAgregarGuiasOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar más guías de envío</DialogTitle>
            <DialogDescription>
              Ingresa una o más guías de envío (una por línea). Solo se agregarán al lote las guías que tengan paquetes registrados en el sistema.
            </DialogDescription>
          </DialogHeader>
          <textarea
            value={nuevasGuiasText}
            onChange={(e) => setNuevasGuiasText(e.target.value)}
            rows={5}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-mono"
            placeholder="Una guía de envío por línea"
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogAgregarGuiasOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleAgregarGuias}
              disabled={addGuias.isPending || parseGuias(nuevasGuiasText).length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              {addGuias.isPending ? 'Agregando...' : 'Agregar guías al lote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {l.paquetes && l.paquetes.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
            Paquetes agrupados por destinatario / provincia / cantón ({l.paquetes.length})
          </h3>
          <div className="space-y-4">
            {groupedPaquetes.map((group) => (
              <div key={group.key} className="surface-card p-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-muted)]/30 px-4 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[var(--color-foreground)]">{group.destinatario}</p>
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {group.provincia} / {group.canton}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{group.paquetes.length} paquete(s)</Badge>
                    <Badge variant="outline">
                      {[
                        group.pesoKg > 0 ? `${group.pesoKg.toFixed(2)} kg` : null,
                        group.pesoLbs > 0 ? `${group.pesoLbs.toFixed(2)} lbs` : null,
                      ].filter(Boolean).join(' / ') || 'Peso —'}
                    </Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => void copyGroupGuias(group)}
                    >
                      Copiar guías del grupo
                    </Button>
                  </div>
                </div>
                <ListTableShell>
                  <table className="compact-table min-w-[980px]">
                    <thead>
                      <tr>
                        <th>Ref</th>
                        <th>Guía</th>
                        <th>Guía envío</th>
                        <th>Destinatario</th>
                        <th>Dirección</th>
                        <th>Provincia / Cantón</th>
                        <th>Peso</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.paquetes.map((p) => (
                        <tr key={p.id}>
                          <td className="font-mono text-sm">{p.ref ?? '—'}</td>
                          <td className="font-medium">{p.numeroGuia}</td>
                          <td>{p.numeroGuiaEnvio ?? '—'}</td>
                          <td>{p.destinatarioNombre ?? '—'}</td>
                          <td className="max-w-[180px] truncate" title={p.destinatarioDireccion ?? ''}>
                            {p.destinatarioDireccion ?? '—'}
                          </td>
                          <td>
                            {[p.destinatarioProvincia, p.destinatarioCanton].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td>
                            {[p.pesoKg != null ? `${p.pesoKg} kg` : null, p.pesoLbs != null ? `${p.pesoLbs} lbs` : null]
                              .filter(Boolean)
                              .join(' / ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ListTableShell>
              </div>
            ))}
          </div>
        </section>
      )}

      {(!l.paquetes || l.paquetes.length === 0) && (
        <p className="text-sm text-[var(--color-muted-foreground)]">
          No hay paquetes asociados a las guías de este lote.
        </p>
      )}

    </div>
  );
}
