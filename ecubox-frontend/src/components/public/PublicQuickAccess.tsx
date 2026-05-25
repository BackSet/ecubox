import { Link } from '@tanstack/react-router';
import { ArrowRight, Calculator, PackageSearch } from 'lucide-react';

const LINKS = [
  {
    to: '/tracking' as const,
    label: 'Rastrear envío',
    description: 'Consulta el estado de tu paquete con tu número de guía.',
    icon: PackageSearch,
    accent: 'text-[var(--color-primary)]',
  },
  {
    to: '/calculadora' as const,
    label: 'Cotizar envío',
    description: 'Calcula el costo estimado según el peso de tu paquete.',
    icon: Calculator,
    accent: 'text-[var(--color-ecubox-acento-claro)]',
  },
];

export function PublicQuickAccess() {
  return (
    <section
      aria-labelledby="acceso-rapido-heading"
      className="content-container-wide mobile-safe-inline -mt-2 pb-2 sm:-mt-4"
    >
      <h2 id="acceso-rapido-heading" className="sr-only">
        Acceso rápido
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="landing-card-interactive group flex items-start gap-4 p-4 sm:p-5"
            >
              <span
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] ${link.accent}`}
              >
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 text-sm font-semibold landing-text sm:text-base">
                  {link.label}
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
                <span className="mt-1 block text-xs leading-relaxed landing-text-muted sm:text-sm">
                  {link.description}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

