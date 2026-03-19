import { Link } from '@tanstack/react-router';
import { Menu } from 'lucide-react';
import { EcuboxLogo } from '@/components/brand';
import { Button } from '@/components/ui/button';

export function SiteHeader() {
  return (
    <header className="bg-transparent sticky top-0 z-50 border-b border-white/10 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <Link to="/" className="flex-shrink-0 p-1.5 -m-1.5 rounded-xl hover:bg-white/5 transition" aria-label="ECUBOX - Inicio">
          <EcuboxLogo variant="principal" size="lg" asLink={false} iconOnly />
        </Link>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="md:hidden text-white hover:bg-white/10"
          aria-label="Menú"
        >
          <Menu className="h-6 w-6" />
        </Button>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-white/90">
          <Link to="/tracking" className="hover:text-white transition">Rastreo</Link>
          <Link to="/calculadora" className="hover:text-white transition">Tarifas</Link>
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg border border-[var(--color-ecubox-purple-light)] text-white font-medium text-sm hover:bg-[var(--color-ecubox-purple-light)]/10 transition"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            className="px-4 py-2 rounded-lg bg-[var(--color-ecubox-nuevo-acento)] text-white font-medium text-sm hover:opacity-90 transition"
          >
            Registrarse
          </Link>
        </div>
      </div>
    </header>
  );
}
