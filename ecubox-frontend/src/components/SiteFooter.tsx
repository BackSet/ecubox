import { Link } from '@tanstack/react-router';
import { EcuboxLogo } from '@/components/brand';
import { Button } from '@/components/ui/button';

export function SiteFooter() {
  return (
    <footer className="bg-[var(--color-landing-bg)] border-t border-white/10 py-16 px-6 text-white/80">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10 mb-14">
          <div className="flex flex-col gap-4">
            <Link to="/" className="w-fit" aria-label="ECUBOX - Inicio">
              <EcuboxLogo variant="principal" size="lg" asLink={false} iconOnly />
            </Link>
            <p className="text-sm text-white/60 max-w-xs leading-relaxed">
              Logística de clase mundial con el corazón del Ecuador. Entregamos tus sueños, no solo paquetes.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10 border-t border-white/10 pt-12">
          <div>
            <h4 className="font-semibold text-xs uppercase mb-4 tracking-wider text-[var(--color-ecubox-purple-light)]">
              Beneficios
            </h4>
            <p className="text-sm mb-4 text-white/60 leading-relaxed">
              Únete a ECUBOX y accede a descuentos, puntos por envío y atención prioritaria.
            </p>
            <Button asChild className="h-10 px-6">
              <Link to="/registro">
                Registrarse
              </Link>
            </Button>
          </div>
          <div>
            <h4 className="font-semibold text-xs uppercase mb-4 tracking-wider text-white/70">
              Servicio al cliente
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/tracking" className="hover:text-[var(--color-ecubox-purple-light)] transition">Rastreo de carga</Link>
              </li>
              <li>
                <Link to="/calculadora" className="hover:text-[var(--color-ecubox-purple-light)] transition">Calculadora de fletes</Link>
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-12 pt-8 border-t border-white/10 text-xs text-white/50 text-center md:text-left">
          © ECUBOX LOGISTICS ECUADOR {new Date().getFullYear()} — Hecho con dedicación en Ecuador.
        </p>
      </div>
    </footer>
  );
}
