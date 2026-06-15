import { useState } from 'react';
import { AlertTriangle, Check, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { notify } from '@/lib/notify';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { useAprobarGuiaMaster, useGuiaMasterHistorial } from '@/hooks/useGuiasMaster';
import type { GuiaMaster } from '@/types/guia-master';
import { GuiaMasterEstadoBadge } from './_estado';

interface AprobarGuiaDialogProps {
  guia: GuiaMaster;
  onClose: () => void;
  /** Abre el diálogo de "Enviar a revisión" para esta guía (la página intercambia diálogos). */
  onEnviarRevision: (guia: GuiaMaster) => void;
}

/**
 * Diálogo de aprobación de una guía master pendiente o en revisión. Muestra el
 * resumen (cliente, consignatario, fecha, totales, inconsistencias, estado) y el
 * historial reciente, con tres acciones: Aprobar, Enviar a revisión y Cancelar.
 *
 * Si la guía tiene paquetes ya registrados (inconsistencia administrativa),
 * exige una confirmación explícita antes de habilitar Aprobar.
 */
export function AprobarGuiaDialog({ guia, onClose, onEnviarRevision }: AprobarGuiaDialogProps) {
  const aprobar = useAprobarGuiaMaster();
  const { data: historial, isLoading: cargandoHistorial } = useGuiaMasterHistorial(guia.id);
  const registradas = guia.piezasRegistradas ?? 0;
  const tieneInconsistencia = registradas > 0;
  const [confirmaInconsistencia, setConfirmaInconsistencia] = useState(false);
  const puedeAprobar = !tieneInconsistencia || confirmaInconsistencia;

  async function handleAprobar() {
    try {
      await aprobar.mutateAsync(guia.id);
      notify.success('Guía master aprobada', `${guia.trackingBase} · El estado se recalculará según sus paquetes.`);
      onClose();
    } catch (err: unknown) {
      notify.error('No se pudo aprobar la guía master', getApiErrorMessage(err) ?? guia.trackingBase);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && !aprobar.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aprobar guía master</DialogTitle>
          <p className="text-sm text-muted-foreground">
            La guía quedará habilitada para la operación y su estado se recalculará según sus paquetes.
          </p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="break-all font-mono text-sm font-medium">{guia.trackingBase}</span>
            <GuiaMasterEstadoBadge estado={guia.estadoGlobal} />
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <DetalleItem label="Cliente" value={guia.clienteUsuarioNombre ?? '—'} />
            <DetalleItem label="Consignatario" value={guia.consignatarioNombre ?? 'Sin asignar'} />
            <DetalleItem label="Registrada" value={fmtFecha(guia.createdAt)} />
            <DetalleItem
              label="Total esperado"
              value={guia.totalPiezasEsperadas != null ? String(guia.totalPiezasEsperadas) : 'Sin definir'}
            />
            <DetalleItem label="Registrados" value={String(registradas)} />
            <DetalleItem label="Recibidos" value={String(guia.piezasRecibidas ?? 0)} />
            <DetalleItem label="Despachados" value={String(guia.piezasDespachadas ?? 0)} />
          </dl>

          {tieneInconsistencia && (
            <div className="rounded-md border border-[var(--color-warning)] bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] p-3 text-xs">
              <p className="flex items-start gap-2 font-medium text-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-warning)]" aria-hidden />
                Requiere revisión: {registradas} paquete{registradas === 1 ? '' : 's'} ya registrado
                {registradas === 1 ? '' : 's'} antes de aprobar.
              </p>
              <p className="mt-1 pl-6 text-muted-foreground">
                Los datos históricos no se modifican automáticamente. Revísalos antes de aprobar.
              </p>
              <label className="mt-2 flex cursor-pointer items-start gap-2 pl-6 text-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={confirmaInconsistencia}
                  onChange={(e) => setConfirmaInconsistencia(e.target.checked)}
                />
                <span>Revisé la inconsistencia y quiero aprobar de todos modos.</span>
              </label>
            </div>
          )}

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Historial reciente
            </p>
            {cargandoHistorial ? (
              <p className="text-xs text-muted-foreground">Cargando historial...</p>
            ) : historial && historial.length > 0 ? (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {historial.slice(0, 4).map((h) => (
                  <li key={h.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {h.tipoCambio}
                      {h.motivo ? ` · ${h.motivo}` : ''}
                    </span>
                    <span className="shrink-0">{fmtFecha(h.cambiadoEn)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">Sin historial disponible.</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={aprobar.isPending}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onEnviarRevision(guia)}
            disabled={aprobar.isPending}
          >
            <Eye className="mr-2 h-4 w-4" />
            Enviar a revisión
          </Button>
          <Button type="button" onClick={handleAprobar} disabled={!puedeAprobar || aprobar.isPending}>
            {aprobar.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            {aprobar.isPending ? 'Aprobando...' : 'Aprobar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DetalleItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="truncate text-foreground" title={value}>{value}</dd>
    </div>
  );
}

function fmtFecha(s?: string | null): string {
  if (!s) return '—';
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
}
