import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowRight, X } from 'lucide-react';
import type { SeasonDefinition } from '@/data/seasons';

export interface SeasonBannerProps {
  season: SeasonDefinition;
}

function dismissKey(id: string): string {
  return `ecubox:season-banner-dismissed:${id}`;
}

/**
 * Banner promocional de temporada. Aparece bajo el header en las páginas
 * públicas y el usuario puede descartarlo (se recuerda por sesión y temporada).
 */
export function SeasonBanner({ season }: SeasonBannerProps) {
  const { banner } = season;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(window.sessionStorage.getItem(dismissKey(season.id)) !== '1');
    } catch {
      setVisible(true);
    }
  }, [season.id]);

  if (!banner || !visible) return null;

  function cerrar() {
    setVisible(false);
    try {
      window.sessionStorage.setItem(dismissKey(season.id), '1');
    } catch {
      /* almacenamiento no disponible: se ignora */
    }
  }

  return (
    <div className="season-banner" role="region" aria-label={`Promoción ${season.nombre}`}>
      <div className="content-container mobile-safe-inline flex items-center gap-3 py-2.5">
        <p className="min-w-0 flex-1 text-sm font-medium leading-snug">{banner.texto}</p>
        {banner.cta ? (
          <Link
            to={banner.cta.href}
            className="hidden shrink-0 items-center gap-1.5 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-xs font-semibold text-[var(--color-primary-foreground)] transition hover:opacity-90 sm:inline-flex"
          >
            {banner.cta.label}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        ) : null}
        <button
          type="button"
          onClick={cerrar}
          aria-label="Cerrar promoción"
          className="shrink-0 rounded-md p-1 text-[var(--color-landing-text-muted)] transition hover:bg-[var(--color-landing-card-muted)] hover:text-[var(--color-landing-text)]"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
