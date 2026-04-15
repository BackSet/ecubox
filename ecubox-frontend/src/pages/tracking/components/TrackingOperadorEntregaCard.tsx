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
  const isDomicilio = tipoEntrega === 'DOMICILIO';
  const isAgencia = tipoEntrega === 'AGENCIA';
  const isAgenciaDistribuidor = tipoEntrega === 'AGENCIA_DISTRIBUIDOR';
  const tipoVisual =
    !tipoEntrega
      ? { label: 'Modalidad no disponible', color: 'bg-[var(--color-muted-foreground)]' }
      : isDomicilio
      ? { label: 'Entrega a domicilio', color: 'bg-[var(--color-info)]' }
      : isAgencia
        ? { label: 'Retiro en agencia', color: 'bg-[var(--color-success)]' }
        : { label: 'Retiro en agencia aliada', color: 'bg-[var(--color-warning)]' };

  return (
    <section className="surface-card p-5 sm:p-6 space-y-4">
      <h3 className="text-base font-semibold text-[var(--color-foreground)]">
        Datos de entrega
      </h3>
      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-muted)]/25 px-3 py-1.5">
        <span className={`h-2.5 w-2.5 rounded-full ${tipoVisual.color}`} />
        <span className="text-sm font-medium text-[var(--color-foreground)]">{tipoVisual.label}</span>
      </div>

      <div className="space-y-3 text-sm">
        {isDomicilio ? (
          <div className="rounded-lg border border-[var(--color-border)] p-4 space-y-2.5">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Empresa de entrega
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                {op?.distribuidorNombre ?? 'No disponible'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Horario de entrega
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                {op?.horarioRepartoDistribuidor ?? 'No disponible'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                Plazo máximo de entrega a domicilio (días)
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--color-foreground)]">
                {op?.diasMaxRetiroDomicilio ?? 'No informado'}
              </p>
            </div>
          </div>
        ) : null}

        {isAgencia ? (
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Agencia de retiro</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {op?.agenciaNombre ?? 'No disponible'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {op?.agenciaDireccion ?? 'Sin dirección'} - {op?.agenciaProvincia ?? '—'} / {op?.agenciaCanton ?? '—'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Horario: {op?.horarioAtencionAgencia ?? 'No disponible'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Plazo máximo para retirar en agencia: {op?.diasMaxRetiroAgencia ?? 'No informado'} día(s)
            </p>
          </div>
        ) : null}
        {isAgenciaDistribuidor && (
          <div className="rounded-lg border border-[var(--color-border)] p-4">
            <p className="text-sm font-semibold text-[var(--color-foreground)]">Agencia de distribución asociada</p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {op?.agenciaDistribuidorEtiqueta ?? 'No disponible'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              {op?.agenciaDistribuidorDireccion ?? 'Sin dirección'} - {op?.agenciaDistribuidorProvincia ?? '—'} / {op?.agenciaDistribuidorCanton ?? '—'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Horario: {op?.horarioAtencionAgenciaDistribuidor ?? 'No disponible'}
            </p>
            <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
              Plazo máximo para retirar en esta agencia: {op?.diasMaxRetiroAgenciaDistribuidor ?? 'No informado'} día(s)
            </p>
          </div>
        )}

        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-4">
          <p className="text-sm font-semibold text-[var(--color-foreground)]">Seguimiento en la web de la empresa de entrega</p>
          <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
            También puedes revisar el estado en su sitio oficial. Copia tu número de guía y pégalo en su buscador para ver el seguimiento del paquete.
          </p>
          {trackingUrl.href ? (
            <div className="mt-3 space-y-2.5">
              <div className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-background)] px-2.5 py-1 text-xs font-medium text-[var(--color-muted-foreground)]">
                {trackingUrl.host}
              </div>
              <a
                href={trackingUrl.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)] transition"
              >
                Ver seguimiento en el sitio oficial
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              No disponible para este envío.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

