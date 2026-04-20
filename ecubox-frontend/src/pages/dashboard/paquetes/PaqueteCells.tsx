import { Phone, MapPin } from 'lucide-react';
import type { Paquete } from '@/types/paquete';
import { MonoTrunc } from '@/components/MonoTrunc';

/**
 * Celda compartida para mostrar la guía master + pieza.
 * - Línea 1: `trackingBase` (enlace a la guía master o al tracking si no hay
 *   guía master) con botón para copiar inline.
 * - Línea 2 (si hay pieza): "Pieza N de M" con botón para copiar el
 *   `numeroGuia` individual del paquete.
 */
export function GuiaMasterPiezaCell({ paquete: p }: { paquete: Paquete }) {
  const trackingBase = p.guiaMasterTrackingBase ?? p.numeroGuia;
  const guiaHref = p.guiaMasterId != null ? `/guias-master/${p.guiaMasterId}` : null;
  const trackingHref = `/tracking?numeroGuia=${encodeURIComponent(p.numeroGuia)}`;
  const tienePieza = p.piezaNumero != null && p.piezaTotal != null;

  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <MonoTrunc
        value={trackingBase}
        as="a"
        href={guiaHref ?? trackingHref}
        title={
          guiaHref
            ? `Ver guía master: ${trackingBase}`
            : `Ver tracking: ${trackingBase}`
        }
        className="font-medium text-primary"
      />
      {tienePieza && (
        <div className="flex min-w-0 items-center gap-1">
          <a
            href={trackingHref}
            className="text-xs text-muted-foreground hover:text-primary hover:underline"
            title={`Ver tracking de esta pieza · ${p.numeroGuia}`}
          >
            Pieza {p.piezaNumero} de {p.piezaTotal}
          </a>
          <MonoTrunc
            value={p.numeroGuia}
            iconOnly
            title="Copiar guía del paquete"
          />
        </div>
      )}
    </div>
  );
}

/**
 * Componente genérico para mostrar el consignatario con datos enriquecidos
 * (nombre, teléfono, dirección y cantón/provincia). Sirve tanto para
 * paquetes como para guías master, ya que ambas comparten estos campos.
 */
export interface ConsignatarioInfoProps {
  nombre?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  provincia?: string | null;
  canton?: string | null;
  emptyLabel?: string;
  emptyItalic?: boolean;
}

export function ConsignatarioInfo({
  nombre,
  telefono,
  direccion,
  provincia,
  canton,
  emptyLabel = '—',
  emptyItalic = false,
}: ConsignatarioInfoProps) {
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

/** Wrapper de `ConsignatarioInfo` que toma los datos directamente del paquete. */
export function ConsignatarioCell({ paquete: p }: { paquete: Paquete }) {
  return (
    <ConsignatarioInfo
      nombre={p.consignatarioNombre}
      telefono={p.consignatarioTelefono}
      direccion={p.consignatarioDireccion}
      provincia={p.consignatarioProvincia}
      canton={p.consignatarioCanton}
    />
  );
}
