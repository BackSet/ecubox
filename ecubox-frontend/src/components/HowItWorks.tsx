import {
  CreditCard,
  PackageCheck,
  PackageOpen,
  Plane,
  type LucideIcon,
} from 'lucide-react';

interface Step {
  number: string;
  title: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    number: '01',
    title: 'Compra en USA',
    description:
      'Usa tu dirección personal de New Jersey para tus compras en Amazon, eBay, Shein y más.',
    icon: CreditCard,
  },
  {
    number: '02',
    title: 'Recibimos por ti',
    description:
      'Verificamos tu paquete, lo registramos en tu casillero y te notificamos al instante.',
    icon: PackageOpen,
  },
  {
    number: '03',
    title: 'Despachamos a Ecuador',
    description:
      'Consolidamos tus envíos y los enviamos en nuestros despachos frecuentes con seguimiento.',
    icon: Plane,
  },
  {
    number: '04',
    title: 'Recibe tu paquete',
    description:
      'Retira en agencia o recíbelo a domicilio. Te avisamos en cada cambio de estado.',
    icon: PackageCheck,
  },
];

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      className="content-container-wide mobile-safe-inline section-spacing"
    >
      <div className="mx-auto mb-10 max-w-2xl text-center md:mb-12">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wider landing-text-muted">
          Cómo funciona
        </p>
        <h2 className="landing-text responsive-title font-bold">
          Tu envío en 4 pasos simples
        </h2>
        <p className="landing-text-muted mt-3 text-sm sm:text-base">
          Sin papeleos complicados. Comprar desde Estados Unidos nunca fue tan fácil.
        </p>
      </div>

      <ol className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isLast = idx === STEPS.length - 1;
          return (
            <li
              key={step.number}
              className="landing-card relative flex flex-col p-5 sm:p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-3xl font-extrabold leading-none text-[var(--color-primary)]/30 sm:text-4xl">
                  {step.number}
                </span>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Icon className="h-5 w-5" strokeWidth={1.8} />
                </div>
              </div>
              <h3 className="landing-text mt-4 text-base font-semibold sm:text-lg">
                {step.title}
              </h3>
              <p className="landing-text-muted mt-1.5 text-sm leading-relaxed">
                {step.description}
              </p>
              {!isLast ? (
                <span
                  aria-hidden
                  className="pointer-events-none absolute -right-3 top-1/2 hidden h-px w-6 -translate-y-1/2 bg-gradient-to-r from-[var(--color-primary)]/35 to-transparent xl:block"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
