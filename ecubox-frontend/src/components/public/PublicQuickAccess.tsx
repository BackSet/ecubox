import { Link } from '@tanstack/react-router';
import { ArrowRight, Calculator, Clock3, MapPinned, PackageCheck } from 'lucide-react';

const LINKS = [
  {
    to: '/calculadora' as const,
    label: 'Antes de comprar',
    description: 'Calcula peso, costo estimado y decide si conviene consolidar.',
    icon: Calculator,
    accent: 'text-[var(--color-primary)]',
  },
  {
    to: '/tracking' as const,
    label: 'Durante el trayecto',
    description: 'Revisa el punto actual del envio y la siguiente accion esperada.',
    icon: MapPinned,
    accent: 'text-[var(--color-ecubox-acento-claro)]',
  },
  {
    to: '/registro' as const,
    label: 'Listo para recibir',
    description: 'Activa tu casillero y deja tus datos preparados para el despacho.',
    icon: PackageCheck,
    accent: 'text-[var(--color-success)]',
  },
];

export function PublicQuickAccess() {
  return (
    <section
      aria-labelledby="acceso-rapido-heading"
      className="content-container-wide mobile-safe-inline -mt-2 pb-4 sm:-mt-4"
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1 text-xs font-semibold landing-text-muted">
            <Clock3 className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden />
            Ruta de compra
          </p>
          <h2 id="acceso-rapido-heading" className="text-xl font-bold landing-text sm:text-2xl">
            Resuelve cada momento sin buscar de mas.
          </h2>
        </div>
        <p className="max-w-xl text-sm leading-relaxed landing-text-muted">
          Planifica, sigue y prepara la entrega desde puntos de entrada claros.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        {LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className="landing-card-interactive group flex min-h-[132px] items-start gap-4 p-4 sm:p-5"
            >
              <span
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] ${link.accent}`}
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
                <span className="mt-1.5 block text-xs leading-relaxed landing-text-muted sm:text-sm">
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
