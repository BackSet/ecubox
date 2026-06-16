import { Hero } from '@/components/Hero';
import { ServicesGrid } from '@/components/ServicesGrid';
import { HowItWorks } from '@/components/HowItWorks';
import { CallToActionBanner } from '@/components/CallToActionBanner';
import { FAQ } from '@/components/FAQ';
import { HomeJsonLdCanales } from '@/components/public/HomeJsonLdCanales';
import { LandingFeaturedCampaign } from '@/components/public/FeaturedCampaignSection';
import { MultiDestinatariosSection } from '@/components/public/MultiDestinatariosSection';
import { PublicContactBlock } from '@/components/public/PublicContactBlock';
import { PublicPageLayout } from '@/components/public/PublicPageLayout';
import { PwaLandingPanel } from '@/components/public/PwaLandingPanel';

export function HomePage() {
  return (
    <PublicPageLayout skipLink topSlot={<HomeJsonLdCanales />}>
      <Hero />
      <LandingFeaturedCampaign />
      <ServicesGrid />
      <HowItWorks />
      <MultiDestinatariosSection />
      <CallToActionBanner />
      <PwaLandingPanel />
      <FAQ />
      <PublicContactBlock />
    </PublicPageLayout>
  );
}
