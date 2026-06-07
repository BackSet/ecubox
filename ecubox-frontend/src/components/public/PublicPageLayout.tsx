import type { ReactNode } from 'react';
import { SiteHeader, type SiteHeaderVariant } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { SeasonBanner } from '@/components/public/SeasonBanner';
import { SeasonOrnament } from '@/components/public/SeasonOrnament';
import { useSeason } from '@/hooks/useSeason';
import { useTemaTemporadaPublic } from '@/hooks/useTemaTemporada';
import { cn } from '@/lib/utils';

export interface PublicPageLayoutProps {
  children: ReactNode;
  headerVariant?: SiteHeaderVariant;
  showOverlay?: boolean;
  skipLink?: boolean;
  mainClassName?: string;
  mainId?: string;
  topSlot?: ReactNode;
}

export function PublicPageLayout({
  children,
  headerVariant = 'default',
  showOverlay = true,
  skipLink = true,
  mainClassName,
  mainId = 'contenido-principal',
  topSlot,
}: PublicPageLayoutProps) {
  const { data: tema } = useTemaTemporadaPublic();
  const activeSeason = useSeason({ override: tema?.override, ventanas: tema?.ventanas });
  return (
    <div
      className="landing-shell"
      data-season={activeSeason?.season.id}
      style={activeSeason?.style}
    >
      {topSlot}
      {activeSeason ? <SeasonOrnament ornamento={activeSeason.season.ornamento} /> : null}
      {skipLink && (
        <a
          href={`#${mainId}`}
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-primary-foreground)] focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Saltar al contenido
        </a>
      )}
      {showOverlay ? <div className="landing-overlay" aria-hidden="true" /> : null}
      <SiteHeader variant={headerVariant} />
      {activeSeason ? <SeasonBanner season={activeSeason.season} /> : null}
      <main
        id={mainId}
        className={cn('relative z-10 flex-1', mainClassName)}
        tabIndex={skipLink ? -1 : undefined}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

