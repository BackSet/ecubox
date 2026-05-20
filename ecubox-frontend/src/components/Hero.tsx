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
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      <div className="content-container mobile-safe-inline landing-hero relative">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.72fr)] lg:gap-10 xl:gap-14">
          <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
            <div className="landing-chip mb-5 inline-flex max-w-full items-center gap-2 px-3 py-2 sm:px-4">
              <Sparkles className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden />
              <span className="rounded bg-[var(--color-primary)] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[var(--color-primary-foreground)]">
                Nuevo
              </span>
              <span className="landing-text-muted min-w-0 truncate text-xs sm:text-sm">
                Cobertura USA → Ecuador
              </span>
            </div>

            <h1 id="hero-heading" className="hero-title landing-text mb-5 max-w-3xl font-bold">
              Tu casillero en USA.{' '}
              <span className="brand-gradient-text">
                Tu paquete en Ecuador.
              </span>
            </h1>
            <p className="landing-text-muted responsive-subtitle mb-7 max-w-2xl lg:mb-8">
              Recibe tus compras de Amazon, eBay, Shein y más en nuestra dirección de
              New Jersey. Nosotros lo enviamos a Ecuador con seguimiento de extremo a
              extremo.
            </p>

            <form
              onSubmit={handleSubmit}
              className="landing-card mb-6 flex w-full max-w-xl flex-col items-stretch gap-2 p-2 sm:flex-row lg:mx-0"
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
                <Input
                  id="hero-tracking"
                  type="text"
                  variant="clean"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Rastrea ahora: ej. ABC1234567890"
                  className="h-11 pl-10 font-mono"
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting || !codigo.trim()}
                className="h-11 gap-2 px-5"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <PackageSearch className="h-4 w-4" aria-hidden />
                )}
                Rastrear
              </Button>
            </form>

            <div className="flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4 lg:mx-0 lg:justify-start">
              <Link
                to="/registro"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-6 py-3.5 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-lg transition hover:opacity-90 sm:px-8 sm:py-4"
              >
                Empezar envío
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                to="/calculadora"
                className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[var(--color-primary)]/55 px-6 py-3.5 text-sm font-semibold landing-text transition hover:bg-[var(--color-primary)]/10 sm:px-8 sm:py-4"
              >
                <Calculator className="h-4 w-4" aria-hidden />
                Cotizar envío
              </Link>
            </div>
          </div>

          <div className="landing-card-muted w-full overflow-hidden p-3 sm:p-4 lg:p-5">
            <p className="landing-text-muted mb-3 text-xs font-medium uppercase">
              Operación ECUBOX
            </p>
            <ul className="grid w-full grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {STATS.map((s) => (
                <li
                  key={s.label}
                  className="landing-card min-h-[88px] px-4 py-4 text-center sm:text-left lg:flex lg:items-center lg:justify-between lg:gap-4"
                >
                  <p className="text-2xl font-bold landing-text sm:text-3xl">{s.value}</p>
                  <p className="mt-0.5 text-xs landing-text-muted sm:text-sm lg:max-w-[11rem] lg:text-right">
                    {s.label}
                  </p>
                </li>
              ))}
            </ul>

            <ul className="mt-5 grid gap-2 text-xs landing-text-muted sm:grid-cols-3 lg:grid-cols-1">
              <li className="inline-flex items-center gap-1.5">
                <Plane className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden />
                Salidas semanales NJ → EC
              </li>
              <li className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-[var(--color-success)]" aria-hidden />
                Manejo seguro y trazable
              </li>
              <li className="inline-flex items-center gap-1.5">
                <Globe2 className="h-3.5 w-3.5 text-[var(--color-ecubox-acento-claro)]" aria-hidden />
                Cobertura nacional en Ecuador
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
