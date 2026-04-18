import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import {
  ArrowRight,
  Calculator,
  Globe2,
  Loader2,
  PackageSearch,
  Plane,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

const STATS = [
  { value: '8-12', label: 'Días promedio USA → EC' },
  { value: '100%', label: 'Trazabilidad por pieza' },
  { value: '24/7', label: 'Rastreo en línea' },
] as const;

export function Hero() {
  const [codigo, setCodigo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const value = codigo.trim();
    if (!value || submitting) return;
    setSubmitting(true);
    void navigate({
      to: '/tracking',
      search: { codigo: value } as never,
    }).finally(() => setSubmitting(false));
  }

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-[var(--color-primary)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-[-8%] h-72 w-72 rounded-full bg-[#2E6BE6]/20 blur-3xl"
      />

      <div className="content-container mobile-safe-inline section-spacing relative">
        <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
          <div className="landing-chip mb-7 inline-flex items-center gap-2 px-4 py-2">
            <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" />
            <span className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-primary-foreground)]">
              Nuevo
            </span>
            <span className="landing-text-muted text-sm">
              Cobertura USA — Ecuador, sin vueltas
            </span>
          </div>

          <h1 className="landing-text responsive-title mx-auto mb-5 max-w-4xl font-bold leading-[1.1]">
            Tu casillero en USA.{' '}
            <span className="bg-gradient-to-br from-[var(--color-primary)] to-[#5B9CFF] bg-clip-text text-transparent">
              Tu paquete en Ecuador.
            </span>
          </h1>
          <p className="landing-text-muted responsive-subtitle mx-auto mb-9 max-w-2xl">
            Recibe tus compras de Amazon, eBay, Shein y más en nuestra dirección de
            New Jersey. Nosotros lo enviamos a Ecuador con seguimiento de extremo a
            extremo.
          </p>

          <form
            onSubmit={handleSubmit}
            className="landing-card mb-7 flex w-full max-w-xl flex-col items-stretch gap-2 p-2 sm:flex-row"
          >
            <label htmlFor="hero-tracking" className="sr-only">
              Número de guía
            </label>
            <div className="relative flex-1">
              <PackageSearch
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-landing-text-muted)]"
                style={{ width: 18, height: 18 }}
                aria-hidden
              />
              <input
                id="hero-tracking"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="Rastrea ahora: ej. ABC1234567890"
                className="h-11 w-full rounded-md border border-transparent bg-transparent pl-10 pr-3 text-sm font-mono outline-none placeholder:text-[var(--color-landing-text-muted)] landing-text focus:border-[var(--color-primary)]/40"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={submitting || !codigo.trim()}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PackageSearch className="h-4 w-4" />
              )}
              Rastrear
            </button>
          </form>

          <div className="mb-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
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
              Cotizar envío
            </Link>
          </div>

          <ul className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {STATS.map((s) => (
              <li
                key={s.label}
                className="landing-card px-4 py-4 text-center sm:text-left"
              >
                <p className="text-2xl font-bold landing-text sm:text-3xl">{s.value}</p>
                <p className="mt-0.5 text-xs landing-text-muted sm:text-sm">{s.label}</p>
              </li>
            ))}
          </ul>

          <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs landing-text-muted sm:text-sm">
            <li className="inline-flex items-center gap-1.5">
              <Plane className="h-3.5 w-3.5 text-[var(--color-primary)]" />
              Salidas semanales NJ → EC
            </li>
            <li className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              Manejo seguro y trazable
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-[#5B9CFF]" />
              Cobertura nacional en Ecuador
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
