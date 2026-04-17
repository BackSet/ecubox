import { Link } from '@tanstack/react-router';
import { EcuboxLogo } from '@/components/brand';

export function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-[var(--color-landing-border)] bg-[var(--color-landing-bg)] py-10 sm:py-12">
      <div className="content-container-wide mobile-safe-inline">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-3">
            <Link to="/" className="w-fit" aria-label="ECUBOX - Inicio">
              <EcuboxLogo variant="principal" size="md" asLink={false} />
            </Link>
            <p className="max-w-xs text-sm leading-relaxed landing-text-muted">
              Logística de clase mundial con el corazón del Ecuador.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:gap-14">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider landing-text-muted">Servicios</h4>
              <ul className="space-y-2 text-sm landing-text">
                <li><Link to="/tracking" className="transition hover:text-[var(--color-primary)]">Rastreo</Link></li>
                <li><Link to="/calculadora" className="transition hover:text-[var(--color-primary)]">Calculadora</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider landing-text-muted">Cuenta</h4>
              <ul className="space-y-2 text-sm landing-text">
                <li><Link to="/login" className="transition hover:text-[var(--color-primary)]">Iniciar sesión</Link></li>
                <li><Link to="/registro" className="transition hover:text-[var(--color-primary)]">Registrarse</Link></li>
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
