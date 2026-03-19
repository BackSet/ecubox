import type { TrackingResponse } from '@/lib/api/tracking.service';
import { ExternalLink } from 'lucide-react';

function parseTrackingUrlLabel(raw?: string): { href: string | null; host: string | null } {
  if (!raw || !raw.trim()) return { href: null, host: null };
  const value = raw.trim();
  try {
    const url = new URL(value);
    return { href: url.toString(), host: url.host };
  } catch {
    return { href: null, host: value };
  }
}

interface TrackingOperadorEntregaCardProps {
  result: TrackingResponse;
}

export function TrackingOperadorEntregaCard({ result }: TrackingOperadorEntregaCardProps) {
  const op = result.operadorEntrega;
  const trackingUrl = parseTrackingUrlLabel(op?.paginaTrackingDistribuidor);
  const tipoEntrega = op?.tipoEntrega;
  const tipoVisual =
    !tipoEntrega
      ? { label: 'Modalidad no disponible', color: 'bg-[var(--color-muted-foreground)]' }
      : tipoEntrega === 'DOMICILIO'
      ? { label: 'Entrega a domicilio', color: 'bg-[var(--color-info)]' }
      : tipoEntrega === 'AGENCIA'
        ? { label: 'Retiro en agencia', color: 'bg-[var(--color-success)]' }
        : { label: 'Retiro en agencia aliada', color: 'bg-[var(--color-warning)]' };

  return (
    <section className="surface-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
        Operador de entrega
      </h3>
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-2.5 py-1">
        <span className={`h-2.5 w-2.5 rounded-full ${tipoVisual.color}`} />
        <span className="text-xs text-[var(--color-foreground)]">{tipoVisual.label}</span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="rounded-lg border border-[var(--color-border)] p-3">
          <p className="font-medium text-[var(--color-foreground)]">Distribuidor</p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            {op?.distribuidorNombre ?? 'No disponible'}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Horario: {op?.horarioRepartoDistribuidor ?? 'No disponible'}
          </p>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Días máx. retiro domicilio: {op?.diasMaxRetiroDomicilio ?? 'No configurado'}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
          <p className="font-medium text-[var(--color-foreground)]">Tracking del distribuidor</p>
          <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
            Consulta el estado directamente en la página oficial del distribuidor.
          </p>
          {trackingUrl.href ? (
            <div className="mt-2 space-y-2">
              <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-[11px] text-[var(--color-muted-foreground)]">
                {trackingUrl.host}
              </div>
              <a
                href={trackingUrl.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition"
              >
                Abrir tracking del distribuidor
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
              No disponible para este envío.
            </p>
          )}
        </div>

        {tipoEntrega === 'AGENCIA' && (
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="font-medium text-[var(--color-foreground)]">Agencia</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {op?.agenciaNombre ?? 'No disponible'}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {op?.agenciaDireccion ?? 'Sin dirección'} - {op?.agenciaProvincia ?? '—'} / {op?.agenciaCanton ?? '—'}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Horario: {op?.horarioAtencionAgencia ?? 'No disponible'}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Días máx. retiro agencia: {op?.diasMaxRetiroAgencia ?? 'No configurado'}
            </p>
          </div>
        )}

        {tipoEntrega === 'AGENCIA_DISTRIBUIDOR' && (
          <div className="rounded-lg border border-[var(--color-border)] p-3">
            <p className="font-medium text-[var(--color-foreground)]">Agencia distribuidor</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {op?.agenciaDistribuidorEtiqueta ?? 'No disponible'}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              {op?.agenciaDistribuidorDireccion ?? 'Sin dirección'} - {op?.agenciaDistribuidorProvincia ?? '—'} / {op?.agenciaDistribuidorCanton ?? '—'}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Horario: {op?.horarioAtencionAgenciaDistribuidor ?? 'No disponible'}
            </p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Días máx. retiro agencia distribuidor: {op?.diasMaxRetiroAgenciaDistribuidor ?? 'No configurado'}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

