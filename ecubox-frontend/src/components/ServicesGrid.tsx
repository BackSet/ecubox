import { Link } from '@tanstack/react-router';
import { Package, MapPin, Zap } from 'lucide-react';

const FEATURES = [
  {
    title: 'Casillero USA',
    description: 'Recibe tus compras en nuestra dirección en New Jersey y consolida envíos para ahorrar en fletes.',
    icon: Package,
    href: '/registro',
  },
  {
    title: 'Rastreo en tiempo real',
    description: 'Sigue tu paquete en cada paso. Consulta el estado de tu envío cuando quieras.',
    icon: MapPin,
    href: '/tracking',
  },
  {
    title: 'Envíos rápidos',
    description: 'Despachos frecuentes desde New Jersey directo a Ecuador. Rapidez y seguridad en cada entrega.',
    icon: Zap,
    href: '/calculadora',
  },
] as const;

export function ServicesGrid() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-16 lg:py-20">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
        {FEATURES.map((feature) => {
          const Icon = feature.icon;
          return (
            <div key={feature.title} className="landing-card flex flex-col p-6 lg:p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] text-[var(--color-primary)]">
                <Icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <h3 className="landing-text mb-2 text-lg font-semibold">{feature.title}</h3>
              <p className="landing-text-muted mb-6 flex-1 text-sm leading-relaxed">{feature.description}</p>
              <Link to={feature.href} className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-primary)] hover:underline">
                Saber más <span aria-hidden>&rarr;</span>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
