import { Link } from '@tanstack/react-router';

const FEATURES = [
  {
    title: 'Casillero USA',
    description: 'Recibe tus compras en nuestra dirección en Miami y consolida envíos para ahorrar en fletes.',
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    href: '/registro',
  },
  {
    title: 'Rastreo en tiempo real',
    description: 'Sigue tu paquete en cada paso. Consulta el estado de tu envío cuando quieras.',
    icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z',
    href: '/tracking',
  },
  {
    title: 'Envíos rápidos',
    description: 'Paga a clientes, socios y proveedores en segundos. Sin demoras ni trámites innecesarios.',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    href: '/calculadora',
  },
];

export function ServicesGrid() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-16 lg:py-20">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl bg-[var(--color-landing-card)] border border-white/10 p-6 lg:p-8 flex flex-col"
          >
            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-white mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d={feature.icon} />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-sm text-white/70 leading-relaxed flex-1 mb-6">{feature.description}</p>
            <Link
              to={feature.href}
              className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-ecubox-purple-light)] hover:underline"
            >
              Saber más
              <span aria-hidden>&rarr;</span>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
