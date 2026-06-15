import { Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Building2,
  Gift,
  MapPin,
  ShoppingBag,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';

interface Beneficio {
  text: string;
}

interface CasoUso {
  title: string;
  description: string;
  icon: LucideIcon;
}

const BENEFICIOS: Beneficio[] = [
  { text: 'Una sola cuenta para todos tus envíos.' },
  { text: 'Un destinatario diferente por guía.' },
  { text: 'Direcciones guardadas para reutilizarlas.' },
  { text: 'Guías y paquetes organizados por persona o ubicación.' },
  { text: 'Menos errores al preparar cada entrega.' },
];

const CASOS_USO: CasoUso[] = [
  {
    title: 'Compras personales',
    description: 'Tus pedidos llegan a tu propia dirección, todo en un mismo lugar.',
    icon: ShoppingBag,
  },
  {
    title: 'Regalos',
    description: 'Envía directo a la persona que quieres sorprender.',
    icon: Gift,
  },
  {
    title: 'Pequeños negocios',
    description: 'Recibe inventario y entrégalo a colaboradores o clientes.',
    icon: Store,
  },
  {
    title: 'Varias sucursales',
    description: 'Cada oficina o sucursal recibe lo que le corresponde.',
    icon: Building2,
  },
];

/**
 * Sección de la home que explica que una sola cuenta ECUBOX puede gestionar
 * varios destinatarios. Usa lenguaje público (cliente): "destinatario", no
 * "consignatario". El CTA apunta a /registro (ruta pública), nunca a una ruta
 * autenticada para usuarios anónimos.
 */
export function MultiDestinatariosSection() {
  return (
    <section
      id="varios-destinatarios"
      aria-labelledby="varios-destinatarios-heading"
      className="content-container-wide mobile-safe-inline section-spacing"
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="flex flex-col">
          <p className="mb-3 inline-flex max-w-full items-center gap-1.5 self-start rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)] px-3 py-1 text-xs font-medium uppercase tracking-wider landing-text-muted">
            <Users className="h-3 w-3 text-[var(--color-primary)]" aria-hidden />
            Varios destinatarios
          </p>
          <h2
            id="varios-destinatarios-heading"
            className="landing-text responsive-title font-bold"
          >
            Envía a diferentes personas desde una sola cuenta
          </h2>
          <p className="landing-text-muted mt-3 text-sm sm:text-base">
            Guarda varios destinatarios y elige quién recibirá cada guía. Así puedes organizar
            compras personales, regalos, envíos para tu negocio o entregas a distintas sucursales
            sin crear cuentas adicionales.
          </p>

          <ul className="mt-6 space-y-2.5">
            {BENEFICIOS.map((b) => (
              <li key={b.text} className="flex items-start gap-2.5 text-sm landing-text">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Users className="h-3 w-3" strokeWidth={2} aria-hidden />
                </span>
                <span>{b.text}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <Link
              to="/registro"
              className="ui-interactive inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-primary-foreground)] shadow-sm hover:opacity-95"
            >
              Crear mi cuenta
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CASOS_USO.map((caso) => {
            const Icon = caso.icon;
            return (
              <article
                key={caso.title}
                className="landing-card flex flex-col p-5"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
                </div>
                <h3 className="landing-text mt-4 text-base font-semibold">{caso.title}</h3>
                <p className="landing-text-muted mt-1.5 text-sm leading-relaxed">
                  {caso.description}
                </p>
              </article>
            );
          })}
          <p className="sm:col-span-2 flex items-start gap-2 text-xs landing-text-muted">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden />
            Cada destinatario puede ser una persona, un familiar, un colaborador, una oficina, una
            sucursal o una dirección habitual.
          </p>
        </div>
      </div>
    </section>
  );
}
