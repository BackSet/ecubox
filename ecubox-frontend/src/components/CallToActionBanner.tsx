import { Link } from '@tanstack/react-router';
import { ArrowRight, Calculator, PackageOpen } from 'lucide-react';

export function CallToActionBanner() {
  return (
    <section
      className="content-container mobile-safe-inline section-spacing"
      aria-labelledby="cta-landing-heading"
    >
      <div className="relative overflow-hidden rounded-2xl border border-[var(--color-primary)]/30 brand-gradient-bg p-7 text-center shadow-xl sm:p-10 md:p-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-white/15 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-white/10 blur-3xl"
        />

        <span className="relative inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
          <PackageOpen className="h-3.5 w-3.5" aria-hidden />
          Tu casillero te espera
        </span>
        <h2 id="cta-landing-heading" className="responsive-title relative mx-auto mt-4 max-w-2xl font-bold text-white">
          Empieza a comprar en USA y recibe en Ecuador hoy mismo
        </h2>
        <p className="relative mx-auto mt-3 max-w-xl text-sm text-white/85 sm:text-base">
          Crear tu casillero es gratis y te toma menos de 2 minutos. Sin tarjetas, sin
          mensualidad.
        </p>

        <div className="relative mt-7 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
          <Link
            to="/registro"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-7 py-3.5 text-sm font-semibold text-[var(--color-primary)] shadow-lg transition hover:bg-white/95 sm:px-9 sm:py-4"
          >
            Crear cuenta gratis
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            to="/calculadora"
            className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-white/70 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/15 sm:px-9 sm:py-4"
          >
            <Calculator className="h-4 w-4" aria-hidden />
            Cotizar primero
          </Link>
        </div>
      </div>
    </section>
  );
}
