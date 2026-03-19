import { SiteHeader } from '@/components/SiteHeader';
import { Hero } from '@/components/Hero';
import { ServicesGrid } from '@/components/ServicesGrid';
import { FAQ } from '@/components/FAQ';
import { SiteFooter } from '@/components/SiteFooter';

export function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--color-landing-bg)] flex flex-col relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 opacity-35 bg-[radial-gradient(circle_at_top_right,rgba(123,63,228,.42),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(46,107,230,.35),transparent_45%)]" />
      <SiteHeader />
      <main className="flex-1 relative z-10">
        <Hero />
        <ServicesGrid />
        <FAQ />
      </main>
      <SiteFooter />
    </div>
  );
}
