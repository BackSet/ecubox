import { useState } from 'react';
import { Copy, Check, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import type { Paquete } from '@/types/paquete';

/**
 * Botón inline para copiar texto al portapapeles, con feedback visual de
 * éxito durante 1.5s. Se evita la propagación del click para que no dispare
 * acciones en filas o links contenedores.
 */
function CopyInlineButton({
  value,
  ariaLabel,
  title,
}: {
  value: string;
  ariaLabel: string;
  title: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={ariaLabel}
      title={`${title}: ${value}`}
      className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-[var(--color-muted)] hover:text-foreground hover:opacity-100"
    >
      {copied ? (
        <Check className="h-3 w-3 text-[var(--color-success)]" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}

/**
 * Celda compartida para mostrar la guía master + pieza.
 * - Línea 1: `trackingBase` (enlace a la guía master o al tracking si no hay
 *   guía master) con botón para copiar el `trackingBase`.
 * - Línea 2 (si hay pieza): "Pieza N de M" con botón para copiar el
 *   `numeroGuia` individual del paquete.
 */
export function GuiaMasterPiezaCell({ paquete: p }: { paquete: Paquete }) {
  const trackingBase = p.guiaMasterTrackingBase ?? p.numeroGuia;
  const guiaHref = p.guiaMasterId != null ? `/guias-master/${p.guiaMasterId}` : null;
  const trackingHref = `/tracking?numeroGuia=${encodeURIComponent(p.numeroGuia)}`;
  const tienePieza = p.piezaNumero != null && p.piezaTotal != null;
  const hayMaster = p.guiaMasterTrackingBase != null;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex min-w-0 items-start gap-1">
        {guiaHref ? (
          <a
            href={guiaHref}
            className="min-w-0 break-all font-mono text-sm font-medium text-primary hover:underline"
            title={`Ver guía master: ${trackingBase}`}
          >
            {trackingBase}
          </a>
        ) : (
          <a
            href={trackingHref}
            className="min-w-0 break-all font-mono text-sm font-medium text-primary hover:underline"
            title={`Ver tracking: ${trackingBase}`}
          >
            {trackingBase}
          </a>
        )}
        <CopyInlineButton
          value={trackingBase ?? ''}
          ariaLabel="Copiar guía master"
          title={hayMaster ? 'Copiar guía master' : 'Copiar guía'}
        />
      </div>
      {tienePieza && (
        <div className="flex min-w-0 items-center gap-1">
          <a
            href={trackingHref}
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
            title={`Ver tracking de esta pieza · ${p.numeroGuia}`}
          >
            Pieza {p.piezaNumero} de {p.piezaTotal}
          </a>
          <CopyInlineButton
            value={p.numeroGuia}
            ariaLabel="Copiar guía del paquete"
            title="Copiar guía del paquete"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Componente genérico para mostrar el destinatario con datos enriquecidos
 * (nombre, teléfono, dirección y cantón/provincia). Sirve tanto para
 * paquetes como para guías master, ya que ambas comparten estos campos.
 */
export interface DestinatarioInfoProps {
  nombre?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  provincia?: string | null;
  canton?: string | null;
  emptyLabel?: string;
  emptyItalic?: boolean;
}

export function DestinatarioInfo({
  nombre,
  telefono,
  direccion,
  provincia,
  canton,
  emptyLabel = '—',
  emptyItalic = false,
}: DestinatarioInfoProps) {
  const n = nombre?.trim();
  const t = telefono?.trim();
  const d = direccion?.trim();
  const ubicacion = [canton, provincia]
    .map((v) => v?.trim())
    .filter((v): v is string => Boolean(v))
    .join(', ');

  if (!n && !t && !d && !ubicacion) {
    return (
      <span className={`text-muted-foreground ${emptyItalic ? 'italic' : ''}`}>{emptyLabel}</span>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-medium text-foreground" title={n ?? undefined}>
        {n ?? emptyLabel}
      </span>
      {t && (
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Phone className="h-3 w-3 shrink-0" />
          <span className="truncate">{t}</span>
        </span>
      )}
      {(d || ubicacion) && (
        <span
          className="flex items-start gap-1 text-xs text-muted-foreground"
          title={[d, ubicacion].filter(Boolean).join(' · ')}
        >
          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
          <span className="line-clamp-2 break-words">
            {d ?? ''}
            {d && ubicacion ? ' · ' : ''}
            {ubicacion}
          </span>
        </span>
      )}
    </div>
  );
}

/** Wrapper de `DestinatarioInfo` que toma los datos directamente del paquete. */
export function DestinatarioCell({ paquete: p }: { paquete: Paquete }) {
  return (
    <DestinatarioInfo
      nombre={p.destinatarioNombre}
      telefono={p.destinatarioTelefono}
      direccion={p.destinatarioDireccion}
      provincia={p.destinatarioProvincia}
      canton={p.destinatarioCanton}
    />
  );
}
