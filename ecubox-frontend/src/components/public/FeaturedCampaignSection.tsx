import { useEffect, useState } from 'react';
import { ArrowRight, Megaphone } from 'lucide-react';
import { useCampaniaLandingPublic } from '@/hooks/useCampaniasLanding';
import { useEffectiveTheme } from '@/hooks/useEffectiveTheme';
import {
  hayCampaniaPublica,
  resolverImagenCampania,
  type CampaniaLandingPublic,
} from '@/types/campania-landing';
import { cn } from '@/lib/utils';

interface FeaturedCampaignSectionProps {
  campania: CampaniaLandingPublic | null | undefined;
  /** Tema efectivo con el que resolver la imagen (claro/oscuro). */
  tema: 'light' | 'dark';
}

/**
 * Sección de contenido destacado (campaña) de la landing. Presentacional y
 * reutilizable: la usa tanto la landing (con el tema real) como la vista previa
 * del editor (con el tema del control), sin duplicar markup. La imagen se
 * resuelve por tema con fallback bidireccional. Si no hay campaña con título, no
 * renderiza nada. Usa solo tokens del tema.
 */
export function FeaturedCampaignSection({ campania, tema }: FeaturedCampaignSectionProps) {
  const { url: imagenUrl } = resolverImagenCampania(campania, tema);
  const [imagenFallo, setImagenFallo] = useState(false);

  // Reinicia el fallo de carga al cambiar la imagen resuelta (p. ej. al cambiar tema).
  useEffect(() => {
    setImagenFallo(false);
  }, [imagenUrl]);

  if (!hayCampaniaPublica(campania) || !campania) return null;

  const tieneCta = !!campania.textoCta && !!campania.urlCta;
  const ctaExterno = campania.tipoDestinoCta === 'EXTERNO';
  const mostrarImagen = !!imagenUrl && !imagenFallo;

  return (
    <section
      id="campania-destacada"
      aria-labelledby="campania-destacada-heading"
      className="content-container-wide mobile-safe-inline section-spacing"
    >
      <div className="landing-card overflow-hidden">
        <div className={cn('grid grid-cols-1 gap-0', mostrarImagen && 'md:grid-cols-2')}>
          {/* Contenido. Sin imagen se centra para una composición equilibrada. */}
          <div
            className={cn(
              'flex flex-col justify-center p-6 sm:p-8 lg:p-10',
              !mostrarImagen && 'mx-auto max-w-3xl items-center text-center',
            )}
          >
            {campania.etiqueta ? (
              <span className="mb-3 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wide landing-text-muted">
                <Megaphone className="h-3 w-3 text-[var(--color-primary)]" aria-hidden />
                {campania.etiqueta}
              </span>
            ) : null}

            <h2 id="campania-destacada-heading" className="landing-text responsive-title font-bold">
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
                  className="ui-interactive ui-transition inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-sm hover:bg-[var(--color-primary)]/90 active:scale-[0.97] sm:w-auto"
                >
                  {campania.textoCta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            ) : null}
          </div>

          {/* Imagen 16:9 (relación reservada para no provocar saltos). */}
          {mostrarImagen ? (
            <div className="relative order-first aspect-[16/9] w-full overflow-hidden bg-[var(--color-landing-card-muted)] md:order-last md:aspect-auto md:min-h-[260px]">
              <img
                src={imagenUrl ?? ''}
                alt={campania.textoAlternativoImagen ?? ''}
                loading="lazy"
                decoding="async"
                onError={() => setImagenFallo(true)}
                className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.02]"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * Envoltura para la landing: obtiene la campaña pública vigente y la renderiza
 * con el tema real de ECUBOX. Al cambiar el tema, la imagen se actualiza en vivo
 * (sin recargar datos). Si la API falla o no hay campaña, no rompe la landing.
 */
export function LandingFeaturedCampaign() {
  const { data } = useCampaniaLandingPublic();
  const tema = useEffectiveTheme();
  return <FeaturedCampaignSection campania={data} tema={tema} />;
}
