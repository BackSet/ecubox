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
      <div className="landing-overlay" />
      <SiteHeader />
      <main className="relative z-10 flex-1">
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
