import {
  CalendarClock,
  MessageCircle,
  PackageCheck,
  Sparkles,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { TrackingResponse } from '@/lib/api/tracking.service';
import { normalizeWhatsAppUrl } from '@/lib/pwa';

interface TrackingInsightCardProps {
  result: TrackingResponse;
  whatsapp?: string | null;
}

export function TrackingInsightCard({ result, whatsapp }: TrackingInsightCardProps) {
  const current = result.estados?.find((estado) => estado.esActual);
  const next = result.estados?.find((estado) => {
    if (estado.tipoFlujo === 'ALTERNO') return false;
    if (!current) return false;
    return estado.orden > current.orden;
  });
  const estimate = buildEstimate(result);
  const nextAction = buildNextAction(result, next?.nombre);
  const whatsappUrl = normalizeWhatsAppUrl(
    whatsapp,
    `Hola ECUBOX, necesito ayuda con mi envio ${result.numeroGuia}.`
  );
  const leyenda = current?.leyenda ?? result.leyenda ?? null;

  return (
    <section className="surface-card space-y-4 p-5 sm:p-6">
      <div>
        <h3 className="inline-flex items-center gap-2 text-base font-semibold text-[var(--color-foreground)]">
          <Sparkles className="h-4 w-4 text-[var(--color-primary)]" />
          Qué significa este estado
        </h3>
        {leyenda ? (
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            {leyenda}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <InsightItem
          icon={<CalendarClock className="h-4 w-4" />}
          label="Estimación"
          value={estimate}
        />
        <InsightItem
          icon={<PackageCheck className="h-4 w-4" />}
          label="Próxima acción"
          value={nextAction}
        />
      </div>

      {whatsappUrl ? (
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-[var(--color-success)] px-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          data-export-exclude
        >
          <MessageCircle className="h-4 w-4" />
          Consultar por WhatsApp
        </a>
      ) : null}
    </section>
  );
}

function InsightItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-muted)]/20 p-3">
      <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-foreground)]">{value}</p>
    </div>
  );
}

function buildEstimate(result: TrackingResponse): string {
  if (result.paqueteVencido) {
    return 'El plazo estimado se cumplió; contáctanos para revisar el caso.';
  }
  if (typeof result.diasRestantes === 'number') {
    if (result.diasRestantes <= 0) return 'Está en la etapa final de retiro o entrega.';
    return `${result.diasRestantes} día${result.diasRestantes === 1 ? '' : 's'} aproximado${result.diasRestantes === 1 ? '' : 's'} para esta etapa.`;
  }
  if (result.fechaEstadoDesde) {
    return 'La fecha final depende de la siguiente actualización operativa.';
  }
  return 'Pendiente de confirmación con el siguiente evento del recorrido.';
}

function buildNextAction(result: TrackingResponse, nextStep?: string): string {
  if (result.paqueteVencido) {
    return 'Escríbenos para validar retiro, entrega o una actualización manual.';
  }
  if (result.flujoActual === 'ALTERNO') {
    return result.motivoAlterno ?? 'Revisaremos la incidencia antes de continuar.';
  }
  if (result.operadorEntrega?.tipoEntrega === 'DOMICILIO') {
    return 'Mantente atento al contacto del operador de entrega.';
  }
  if (result.operadorEntrega?.tipoEntrega === 'AGENCIA') {
    return 'Acércate a la oficina indicada con tu identificación antes de la fecha límite.';
  }
  if (result.operadorEntrega?.tipoEntrega === 'AGENCIA_COURIER_ENTREGA') {
    return 'Cuando esté listo, retira en el punto asignado por el courier.';
  }
  if (nextStep) return `Siguiente etapa esperada: ${nextStep}.`;
  return 'No necesitas hacer nada por ahora; te avisaremos con la próxima novedad.';
}
