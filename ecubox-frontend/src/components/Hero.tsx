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
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { trackingSearchSchema } from '@/lib/schemas/primitives';
import {
  isTrackingSampleCodigo,
  normalizeTrackingSampleCodigo,
} from '@/lib/tracking/trackingSamples';
import { HeroRouteIllustration } from '@/components/public/HeroRouteIllustration';
import { useSeason } from '@/hooks/useSeason';
import { useTemaTemporadaPublic } from '@/hooks/useTemaTemporada';

const STATS = [
  { value: '8-12', label: 'Días promedio USA → EC' },
  { value: '100%', label: 'Trazabilidad por pieza' },
  { value: '24/7', label: 'Rastreo en línea' },
] as const;

export function Hero() {
  const [codigo, setCodigo] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { data: tema } = useTemaTemporadaPublic();
  const season = useSeason({ override: tema?.override, ventanas: tema?.ventanas });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const parsed = trackingSearchSchema.safeParse(codigo);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Código no válido');
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    const codigoConsulta = parsed.data;
    const target = isTrackingSampleCodigo(codigoConsulta)
      ? {
          to: '/tracking/ejemplo' as const,
          search: { codigo: normalizeTrackingSampleCodigo(codigoConsulta) } as never,
        }
      : { to: '/tracking' as const, search: { codigo: codigoConsulta } as never };
    void navigate(target).finally(() => setSubmitting(false));
  }

  return (
    <section className="relative overflow-hidden landing-mesh" aria-labelledby="hero-heading">
      <div className="content-container mobile-safe-inline landing-hero relative">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.72fr)] lg:gap-10 xl:gap-14">
          <div className="flex min-w-0 flex-col items-center text-center lg:items-start lg:text-left">
            {season ? (
              <span className="landing-chip mb-4 inline-flex w-fit items-center gap-1.5 px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
                {season.season.badge}
              </span>
            ) : null}
            <h1 id="hero-heading" className="hero-title landing-text mb-5 max-w-3xl font-bold">
              Tu casillero en USA.{' '}
              <span className="brand-gradient-text">
                Tu paquete en Ecuador.
              </span>
            </h1>
            <p className="landing-text-muted responsive-subtitle mb-7 max-w-2xl lg:mb-8">
              Recibe tus compras de Amazon, eBay, Shein y más en nuestra dirección de
              New Jersey. Nosotros lo enviamos a Ecuador con rastreo de extremo a
              extremo.
            </p>

            <form
              onSubmit={handleSubmit}
              className="landing-card-elevated mb-2 flex w-full max-w-xl flex-col items-stretch gap-2 p-2 sm:flex-row lg:mx-0"
              noValidate
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
                  onChange={(e) => {
                    setCodigo(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Rastrea ahora: ej. ABC1234567890"
                  className="h-11 pl-10 font-mono"
                  autoComplete="off"
                  aria-invalid={Boolean(validationError)}
                  aria-describedby={validationError ? 'hero-tracking-error' : undefined}
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
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
            {validationError ? (
              <p
                id="hero-tracking-error"
                className="mb-4 max-w-xl text-sm text-[var(--color-destructive)]"
                role="alert"
              >
                {validationError}
              </p>
            ) : (
              <p className="mb-6 max-w-xl text-xs landing-text-muted">
                También puedes usar el formato de pieza, por ejemplo{' '}
                <span className="font-mono text-[var(--color-primary)]">ABC123 1/2</span>
                .{' '}
                <Link to="/tracking/ejemplo" className="font-medium text-[var(--color-primary)] hover:underline">
                  Ver ejemplos de demostración
                </Link>
              </p>
            )}

            <div className="flex w-full max-w-xl flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4 lg:mx-0 lg:justify-start">
              <Button asChild size="lg" className="h-12 gap-2 px-8 shadow-lg">
                <Link to="/registro">
                  Empezar envío
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 gap-2 border-2 px-8 landing-text">
                <Link to="/calculadora">
                  <Calculator className="h-4 w-4" aria-hidden />
                  Cotizar envío
                </Link>
              </Button>
            </div>
          </div>

          <div className="landing-card-muted w-full space-y-4 overflow-hidden p-3 sm:p-4 lg:p-5">
            <HeroRouteIllustration />
            <p className="text-xs font-medium uppercase tracking-wider landing-text-muted">
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
