import { Hero } from '@/components/Hero';
import { PublicQuickAccess } from '@/components/public/PublicQuickAccess';
import { ServicesGrid } from '@/components/ServicesGrid';
import { HowItWorks } from '@/components/HowItWorks';
import { CallToActionBanner } from '@/components/CallToActionBanner';
import { FAQ } from '@/components/FAQ';
import { HomeJsonLdCanales } from '@/components/public/HomeJsonLdCanales';
import { PublicContactBlock } from '@/components/public/PublicContactBlock';
import { PublicPageLayout } from '@/components/public/PublicPageLayout';

export function HomePage() {
  return (
    <PublicPageLayout skipLink topSlot={<HomeJsonLdCanales />}>
      <Hero />
      <PublicQuickAccess />
      <ServicesGrid />
      <HowItWorks />
      <CallToActionBanner />
      <FAQ />
      <PublicContactBlock />
    </PublicPageLayout>
  );
}
