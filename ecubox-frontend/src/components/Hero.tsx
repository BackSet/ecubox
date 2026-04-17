import { Link } from '@tanstack/react-router';
import { ArrowRight, Calculator } from 'lucide-react';

export function Hero() {
  return (
    <section className="content-container mobile-safe-inline section-spacing text-center">
      <div className="landing-chip mb-8 inline-flex items-center gap-2 px-4 py-2">
        <span className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-xs font-bold uppercase text-[var(--color-primary-foreground)]">
          Nuevo
        </span>
        <span className="landing-text-muted text-sm">Cobertura USA — Ecuador</span>
      </div>

      <h1 className="landing-text responsive-title mx-auto mb-5 max-w-4xl font-bold">
        Tu red logística completa
      </h1>
      <p className="landing-text-muted responsive-subtitle mx-auto mb-10 max-w-2xl md:mb-12">
        Desde envíos internacionales hasta protección de tu carga, todo en un solo lugar.
      </p>

      <div className="flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to="/registro"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-lg transition hover:opacity-90 sm:px-8 sm:py-4"
        >
          Empezar envío
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/calculadora"
          className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[var(--color-primary)]/55 px-6 py-3.5 text-sm font-semibold landing-text transition hover:bg-[var(--color-primary)]/10 sm:px-8 sm:py-4"
        >
          <Calculator className="h-4 w-4" />
          Calculadora
        </Link>
      </div>
    </section>
  );
}
