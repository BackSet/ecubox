import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicPageHero } from '@/components/public/PublicPageHero';
import { PublicPageLayout } from '@/components/public/PublicPageLayout';

type LegalPageLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, subtitle, children }: LegalPageLayoutProps) {
  return (
    <PublicPageLayout headerVariant="tool" mainClassName="mobile-safe-inline py-6 sm:py-10">
      <div className="content-container-wide w-full max-w-3xl space-y-6">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="-ml-2 gap-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          asChild
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Volver al inicio
          </Link>
        </Button>

        <PublicPageHero
          title={title}
          description={subtitle ?? 'Documento legal de ECUBOX.'}
        />

        <p className="border-b border-[var(--color-landing-border)] pb-6 text-xs landing-text-muted">
          Última actualización: 23 de abril de 2026
        </p>

        <article className="pb-4 text-sm leading-relaxed sm:text-[15px]">{children}</article>
      </div>
    </PublicPageLayout>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-base font-semibold tracking-tight landing-text sm:text-lg">
        {title}
      </h2>
      <div className="space-y-3 text-[var(--color-muted-foreground)] [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_strong]:font-medium [&_strong]:text-[var(--color-foreground)]">
        {children}
      </div>
    </section>
  );
}
