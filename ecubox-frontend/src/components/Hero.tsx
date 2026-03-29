import { Link } from '@tanstack/react-router';
import { ArrowRight, Calculator } from 'lucide-react';

export function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-20 text-center lg:py-28">
      <div className="landing-chip mb-8 inline-flex items-center gap-2 px-4 py-2">
        <span className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-xs font-bold uppercase text-[var(--color-primary-foreground)]">
          Nuevo
        </span>
        <span className="landing-text-muted text-sm">Cobertura USA — Ecuador</span>
      </div>

      <h1 className="landing-text mb-6 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
        Tu red logística completa
      </h1>
      <p className="landing-text-muted mx-auto mb-12 max-w-2xl text-lg leading-relaxed md:text-xl">
        Desde envíos internacionales hasta protección de tu carga, todo en un solo lugar.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          to="/registro"
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary)] px-8 py-4 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-lg transition hover:opacity-90"
        >
          Empezar envío
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          to="/calculadora"
          className="inline-flex items-center gap-2 rounded-lg border-2 border-[var(--color-primary)]/55 px-8 py-4 text-sm font-semibold landing-text transition hover:bg-[var(--color-primary)]/10"
        >
          <Calculator className="h-4 w-4" />
          Calculadora
        </Link>
      </div>
    </section>
  );
}
