import { useState } from 'react';
import { ArrowRight, Megaphone } from 'lucide-react';
import { useCampaniaLandingPublic } from '@/hooks/useCampaniasLanding';
import { hayCampaniaPublica, type CampaniaLandingPublic } from '@/types/campania-landing';

interface FeaturedCampaignSectionProps {
  campania: CampaniaLandingPublic | null | undefined;
}

/**
 * Sección de contenido destacado (campaña) de la landing. Presentacional y
 * reutilizable: la usa tanto la landing (con datos del endpoint público) como
 * la vista previa del editor (con datos del formulario en curso), sin duplicar
 * markup. Si no hay campaña con título, no renderiza nada (sin reservar espacio
 * ni mostrar error). Usa exclusivamente tokens del tema (claro/oscuro).
 */
export function FeaturedCampaignSection({ campania }: FeaturedCampaignSectionProps) {
  const [imagenFallo, setImagenFallo] = useState(false);

  if (!hayCampaniaPublica(campania) || !campania) return null;

  const tieneCta = !!campania.textoCta && !!campania.urlCta;
  const ctaExterno = campania.tipoDestinoCta === 'EXTERNO';
  const mostrarImagen = !!campania.imagenUrl && !imagenFallo;

  return (
    <section
      id="campania-destacada"
      aria-labelledby="campania-destacada-heading"
      className="content-container-wide mobile-safe-inline section-spacing"
    >
      <div className="landing-card overflow-hidden">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
          {/* Contenido */}
          <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
            {campania.etiqueta ? (
              <span className="mb-3 inline-flex max-w-full items-center gap-1.5 self-start rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wide landing-text-muted">
                <Megaphone className="h-3 w-3 text-[var(--color-primary)]" aria-hidden />
                {campania.etiqueta}
              </span>
            ) : null}

            <h2
              id="campania-destacada-heading"
              className="landing-text responsive-title font-bold"
            >
              {campania.titulo}
            </h2>

            {campania.descripcion ? (
              <p className="landing-text-muted mt-3 text-sm leading-relaxed sm:text-base">
                {campania.descripcion}
              </p>
            ) : null}

            {tieneCta ? (
              <div className="mt-6">
                <a
                  href={campania.urlCta ?? '#'}
                  {...(ctaExterno ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="ui-interactive inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-sm hover:opacity-95 sm:w-auto"
                >
                  {campania.textoCta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            ) : null}
          </div>

          {/* Imagen (opcional). Relación de aspecto reservada para evitar saltos. */}
          {mostrarImagen ? (
            <div className="relative order-first aspect-[16/10] w-full overflow-hidden bg-[var(--color-landing-card-muted)] md:order-last md:aspect-auto md:min-h-[260px]">
              <img
                src={campania.imagenUrl ?? ''}
                alt={campania.textoAlternativoImagen ?? ''}
                loading="lazy"
                decoding="async"
                onError={() => setImagenFallo(true)}
                className="h-full w-full object-cover"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Envoltura para la landing: obtiene la campaña pública vigente y delega en
 * {@link FeaturedCampaignSection}. Si la API falla o no hay campaña, no rompe la
 * landing (no renderiza nada).
 */
export function LandingFeaturedCampaign() {
  const { data } = useCampaniaLandingPublic();
  return <FeaturedCampaignSection campania={data} />;
}
