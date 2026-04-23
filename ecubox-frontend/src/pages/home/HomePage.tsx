import { SiteHeader } from '@/components/SiteHeader';
import { Hero } from '@/components/Hero';
import { ServicesGrid } from '@/components/ServicesGrid';
import { HowItWorks } from '@/components/HowItWorks';
import { CallToActionBanner } from '@/components/CallToActionBanner';
import { FAQ } from '@/components/FAQ';
import { SiteFooter } from '@/components/SiteFooter';

export function HomePage() {
  return (
    <div className="landing-shell">
      <a
        href="#contenido-principal"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-[var(--color-primary-foreground)] focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Saltar al contenido
      </a>
      <div className="landing-overlay" />
      <SiteHeader />
      <main id="contenido-principal" className="relative z-10 flex-1" tabIndex={-1}>
        <Hero />
        <ServicesGrid />
        <HowItWorks />
        <CallToActionBanner />
        <FAQ />
      </main>
      <SiteFooter />
    </div>
  );
}
