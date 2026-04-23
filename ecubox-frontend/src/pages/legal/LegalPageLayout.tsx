import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { Button } from '@/components/ui/button';

type LegalPageLayoutProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function LegalPageLayout({ title, subtitle, children }: LegalPageLayoutProps) {
  return (
    <div className="landing-shell">
      <div className="landing-overlay" />
      <SiteHeader variant="tool" />

      <main className="relative z-10 mobile-safe-inline flex-1 py-6 sm:py-10">
        <div className="content-container-wide w-full max-w-3xl">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 mb-6 gap-1.5 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
            asChild
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Volver al inicio
            </Link>
          </Button>

          <header className="border-b border-[var(--color-landing-border)] pb-6">
            <h1 className="responsive-title font-bold tracking-tight landing-text">
              {title}
            </h1>
            {subtitle ? (
              <p className="mt-2 text-sm leading-relaxed landing-text-muted sm:text-base">
                {subtitle}
              </p>
            ) : null}
            <p className="mt-3 text-xs landing-text-muted">
              Última actualización: 23 de abril de 2026
            </p>
          </header>

          <article className="py-8 text-sm leading-relaxed sm:text-[15px]">{children}</article>
        </div>
      </main>

      <SiteFooter />
    </div>
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
