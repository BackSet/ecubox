import { Link } from '@tanstack/react-router';
import { Clock, MapPin, ShieldCheck } from 'lucide-react';
import { EcuboxLogo } from '@/components/brand';

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Envíos trazables de punta a punta' },
  { icon: MapPin, label: 'Cobertura nacional en Ecuador' },
  { icon: Clock, label: 'Rastreo disponible 24/7' },
] as const;

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--color-landing-border)] bg-[var(--color-landing-bg)] py-10 sm:py-12">
      <div className="content-container-wide mobile-safe-inline">
        <div className="landing-card-muted mb-8 grid gap-3 p-4 sm:grid-cols-3 sm:gap-4 sm:p-5">
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2.5 text-sm landing-text">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                <Icon className="size-4" aria-hidden />
              </span>
              <span>{label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Link to="/" className="w-fit" aria-label="ECUBOX - Inicio">
              <EcuboxLogo variant="principal" size="md" asLink={false} />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed landing-text-muted">
              Logística de clase mundial con el corazón del Ecuador.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-10 md:gap-14">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider landing-text-muted">Servicios</h4>
              <ul className="flex flex-col gap-2 text-sm landing-text">
                <li><Link to="/tracking" className="transition hover:text-[var(--color-primary)]">Rastreo</Link></li>
                <li><Link to="/calculadora" className="transition hover:text-[var(--color-primary)]">Calculadora</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider landing-text-muted">Cuenta</h4>
              <ul className="flex flex-col gap-2 text-sm landing-text">
                <li><Link to="/login" className="transition hover:text-[var(--color-primary)]">Iniciar sesión</Link></li>
                <li><Link to="/registro" className="transition hover:text-[var(--color-primary)]">Registrarse</Link></li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider landing-text-muted">Legal</h4>
              <ul className="flex flex-col gap-2 text-sm landing-text">
                <li>
                  <Link to="/terminos" className="transition hover:text-[var(--color-primary)]">
                    Términos y condiciones
                  </Link>
                </li>
                <li>
                  <Link to="/privacidad" className="transition hover:text-[var(--color-primary)]">
                    Política de privacidad
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-[var(--color-landing-border)] pt-5 text-center text-xs landing-text-muted md:mt-10 md:pt-6 md:text-left">
          © ECUBOX {new Date().getFullYear()} — Hecho con dedicación en Ecuador.
        </p>
      </div>
    </footer>
  );
}
