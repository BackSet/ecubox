import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Calculator,
  MapPin,
  Package,
  ShieldCheck,
  Sparkles,
  Truck,
  Zap,
  type LucideIcon,
} from 'lucide-react';

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
  href: '/registro' | '/tracking' | '/calculadora';
  ctaLabel: string;
  badge?: string;
  bullets: { icon: LucideIcon; text: string }[];
  accent: string;
}

const FEATURES: Feature[] = [
  {
    title: 'Casillero USA',
    description:
      'Recibe tus compras en nuestra dirección en New Jersey y consolida envíos para ahorrar en fletes.',
    icon: Package,
    href: '/registro',
    ctaLabel: 'Crear mi casillero',
    badge: 'Más popular',
    accent: 'from-[var(--color-primary)]/20 to-[var(--color-primary)]/0',
    bullets: [
      { icon: Sparkles, text: 'Sin mensualidad ni mínimos' },
      { icon: Truck, text: 'Compra en cualquier tienda online' },
    ],
  },
  {
    title: 'Rastreo en tiempo real',
    description:
      'Sigue tu paquete en cada paso. Consulta el estado de tu envío y de cada pieza del consolidado.',
    icon: MapPin,
    href: '/tracking',
    ctaLabel: 'Rastrear ahora',
    accent: 'from-[var(--color-ecubox-acento-claro)]/20 to-[var(--color-ecubox-acento-claro)]/0',
    bullets: [
      { icon: ShieldCheck, text: 'Actualizaciones por estado oficial' },
      { icon: Sparkles, text: 'Funciona con guía o consolidador' },
    ],
  },
  {
    title: 'Envíos rápidos',
    description:
      'Despachos frecuentes desde New Jersey directo a Ecuador. Rapidez y seguridad en cada entrega.',
    icon: Zap,
    href: '/calculadora',
    ctaLabel: 'Calcular tarifa',
    accent: 'from-emerald-400/25 to-emerald-400/0',
    bullets: [
      { icon: Truck, text: '8-12 días laborables promedio' },
      { icon: Calculator, text: 'Sin sorpresas: cotiza antes' },
    ],
  },
];

export function ServicesGrid() {
  return (
    <section
      id="servicios"
      aria-labelledby="servicios-heading"
      className="content-container-wide mobile-safe-inline section-spacing"
    >
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wider landing-text-muted">
          <Sparkles className="h-3 w-3 text-[var(--color-primary)]" aria-hidden />
          Nuestros servicios
        </p>
        <h2 id="servicios-heading" className="landing-text responsive-title font-bold">
          Todo lo que necesitas para enviar desde USA
        </h2>
        <p className="landing-text-muted mt-3 text-sm sm:text-base">
          Una plataforma simple, transparente y conectada con cada etapa de tu envío.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 xl:gap-7">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <article
              key={feature.title}
              className="landing-card group relative flex flex-col overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--color-primary)]/40 hover:shadow-lg sm:p-6 lg:p-7"
            >
              <div
                aria-hidden
                className={`pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${feature.accent}`}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] text-[var(--color-primary)] shadow-sm">
                  <Icon className="h-6 w-6" strokeWidth={1.6} aria-hidden />
                </div>
                {feature.badge ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                    <Sparkles className="h-3 w-3" aria-hidden />
                    {feature.badge}
                  </span>
                ) : null}
              </div>

              <h3 className="landing-text mt-5 text-lg font-semibold sm:text-xl">
                {feature.title}
              </h3>
              <p className="landing-text-muted mt-2 text-sm leading-relaxed">
                {feature.description}
              </p>

              <ul className="mt-4 space-y-2">
                {feature.bullets.map(({ icon: BulletIcon, text }) => (
                  <li
                    key={text}
                    className="inline-flex items-start gap-2 text-sm landing-text"
                  >
                    <BulletIcon
                      className="mt-0.5 h-4 w-4 flex-shrink-0 text-[var(--color-primary)]"
                      strokeWidth={1.8}
                      aria-hidden
                    />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>

              <Link
                to={feature.href}
                className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-primary)] transition group-hover:gap-2.5"
              >
                {feature.ctaLabel}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
