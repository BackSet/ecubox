import { Headphones, ShieldCheck } from 'lucide-react';
import { PublicContactLinks } from '@/components/public/PublicContactLinks';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';

export function PublicContactBlock() {
  const { hasCanales, canales, isLoading, isError } = usePublicCanalesDisponibles();

  if (isLoading || isError || !hasCanales || !canales) {
    return null;
  }

  return (
    <section
      id="contacto"
      aria-labelledby="contacto-heading"
      className="content-container mobile-safe-inline section-spacing"
    >
      <div className="landing-card overflow-hidden">
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-2 md:items-center md:gap-10 lg:p-10">
          <div className="space-y-5">
            <p className="landing-chip inline-flex w-fit items-center gap-2 px-3 py-1.5">
              <Headphones className="size-3.5 text-[var(--color-primary)]" aria-hidden />
              <span className="text-xs font-medium uppercase tracking-wider landing-text-muted">
                Contacto
              </span>
            </p>
            <h2 id="contacto-heading" className="responsive-title font-bold landing-text">
              Estamos aquí para ayudarte
            </h2>
            <p className="max-w-md text-sm leading-relaxed landing-text-muted sm:text-base">
              Escríbenos por el canal que prefieras. Nuestro equipo responde consultas sobre envíos,
              casilleros y tarifas.
            </p>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2.5 text-sm landing-text-muted">
                <ShieldCheck className="size-4 shrink-0 text-[var(--color-success)]" aria-hidden />
                Respuesta en horario laboral
              </li>
              <li className="flex items-center gap-2.5 text-sm landing-text-muted">
                <ShieldCheck className="size-4 shrink-0 text-[var(--color-success)]" aria-hidden />
                Soporte en español
              </li>
            </ul>
          </div>

          <PublicContactLinks canales={canales} variant="landing" />
        </div>
      </div>
    </section>
  );
}


