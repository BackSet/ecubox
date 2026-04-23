import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Menu, X, Moon, Monitor, Sun } from 'lucide-react';
import { EcuboxLogo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/themeStore';

const NAV_LINKS = [
  { to: '/tracking', label: 'Rastreo' },
  { to: '/calculadora', label: 'Tarifas' },
] as const;

const ANCHOR_LINKS = [
  { hash: '#servicios', label: 'Servicios' },
  { hash: '#como-funciona', label: 'Cómo funciona' },
  { hash: '#faq', label: 'FAQ' },
] as const;

export type SiteHeaderVariant = 'default' | 'auth' | 'tool';

interface SiteHeaderProps {
  variant?: SiteHeaderVariant;
}

/**
 * Cabecera publica unificada.
 * - "default": landing principal (anchors + tools).
 * - "auth":    paginas de cuenta (sin anchors, sin botones de cuenta repetidos).
 * - "tool":    herramientas publicas (Tracking / Calculadora) con nav cruzada y CTAs.
 */
export function SiteHeader({ variant = 'default' }: SiteHeaderProps) {
  const { theme, toggleTheme } = useThemeStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const themeIcon = theme === 'dark'
    ? <Moon className="h-4 w-4" />
    : theme === 'system'
      ? <Monitor className="h-4 w-4" />
      : <Sun className="h-4 w-4" />;

  const showAnchors = variant === 'default';
  const showAccountButtons = variant !== 'auth';

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-landing-border)] bg-[color-mix(in_oklab,var(--color-landing-bg)_82%,transparent)] backdrop-blur-md">
      <div className="content-container-wide mobile-safe-inline flex items-center justify-between gap-3 py-3 sm:gap-4">
        <Link to="/" className="flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity" aria-label="ECUBOX - Inicio">
          <EcuboxLogo variant="light" size="lg" asLink={false} />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 text-sm font-medium landing-text lg:flex">
          {showAnchors && ANCHOR_LINKS.map(l => (
            <a key={l.hash} href={l.hash} className="transition hover:text-[var(--color-primary)]">{l.label}</a>
          ))}
          {showAnchors && (
            <span className="h-4 w-px bg-[var(--color-landing-border)]" aria-hidden />
          )}
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} className="transition hover:text-[var(--color-primary)]">{l.label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:gap-3 lg:flex">
          <Button type="button" variant="outline" size="icon" className="landing-text" onClick={toggleTheme} aria-label="Cambiar tema">
            {themeIcon}
          </Button>
          {showAccountButtons && (
            <>
              <Link to="/login" className="rounded-lg border border-[var(--color-primary)]/45 px-4 py-2 text-sm font-medium landing-text transition hover:bg-[var(--color-primary)]/10">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] transition hover:opacity-90">
                Registrarse
              </Link>
            </>
          )}
          {variant === 'auth' && (
            <Link to="/" className="text-sm font-medium landing-text-muted transition hover:text-[var(--color-primary)]">
              Volver al inicio
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="landing-text lg:hidden"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={mobileOpen}
          aria-controls="site-header-mobile-nav"
        >
          {mobileOpen ? <X className="h-6 w-6" aria-hidden /> : <Menu className="h-6 w-6" aria-hidden />}
        </Button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div
          id="site-header-mobile-nav"
          className="border-t border-[var(--color-landing-border)] bg-[var(--color-landing-bg)] px-4 pb-6 pt-4 lg:hidden"
          role="region"
          aria-label="Navegación móvil"
        >
          <nav className="mb-6 flex flex-col gap-1 text-sm font-medium landing-text" aria-label="Principal">
            {showAnchors && ANCHOR_LINKS.map(l => (
              <a key={l.hash} href={l.hash} className="rounded-lg px-3 py-2.5 transition hover:bg-[var(--color-landing-card-muted)]" onClick={() => setMobileOpen(false)}>
                {l.label}
              </a>
            ))}
            {showAnchors && (
              <div className="my-1 h-px bg-[var(--color-landing-border)]" aria-hidden />
            )}
            {NAV_LINKS.map(l => (
              <Link key={l.to} to={l.to} className="rounded-lg px-3 py-2.5 transition hover:bg-[var(--color-landing-card-muted)]" onClick={() => setMobileOpen(false)}>
                {l.label}
              </Link>
            ))}
            {variant === 'auth' && (
              <Link to="/" className="rounded-lg px-3 py-2.5 transition hover:bg-[var(--color-landing-card-muted)]" onClick={() => setMobileOpen(false)}>
                Volver al inicio
              </Link>
            )}
          </nav>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium landing-text-muted uppercase tracking-wider">Tema</span>
              <Button type="button" variant="outline" size="icon" className="landing-text" onClick={toggleTheme} aria-label="Cambiar tema">
                {themeIcon}
              </Button>
            </div>
            {showAccountButtons && (
              <>
                <Link to="/login" className="rounded-lg border border-[var(--color-primary)]/45 px-4 py-2.5 text-center text-sm font-medium landing-text transition hover:bg-[var(--color-primary)]/10" onClick={() => setMobileOpen(false)}>
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-primary-foreground)] transition hover:opacity-90" onClick={() => setMobileOpen(false)}>
                  Registrarse
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
