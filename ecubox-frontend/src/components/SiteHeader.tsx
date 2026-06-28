import { useState } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { Menu, X, Moon, Monitor, Sun } from 'lucide-react';
import { EcuboxLogo } from '@/components/brand';
import { Button } from '@/components/ui/button';
import { useThemeStore } from '@/stores/themeStore';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { to: '/tracking', label: 'Rastreo' },
  { to: '/calculadora', label: 'Calculadora' },
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  function navLinkClass(to: string, exact = false) {
    const active = exact ? pathname === to : pathname.startsWith(to);
    return cn(
      'ui-transition py-1.5 px-3 rounded-md',
      active
        ? 'font-medium text-[var(--color-primary)] bg-[var(--color-primary)]/5'
        : 'text-[var(--color-landing-text-muted)] hover:text-[var(--color-landing-text)] hover:bg-[var(--color-landing-card-muted)]/40'
    );
  }

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
        <nav className="hidden items-center gap-2 text-sm font-medium landing-text lg:flex">
          {showAnchors && ANCHOR_LINKS.map(l => (
            <a key={l.hash} href={l.hash} className="ui-transition py-1.5 px-3 rounded-md text-[var(--color-landing-text-muted)] hover:text-[var(--color-landing-text)] hover:bg-[var(--color-landing-card-muted)]/40">{l.label}</a>
          ))}
          {showAnchors && (
            <span className="h-4 w-px bg-[var(--color-landing-border)] mx-1" aria-hidden />
          )}
          {NAV_LINKS.map(l => (
            <Link key={l.to} to={l.to} className={navLinkClass(l.to)} aria-current={pathname.startsWith(l.to) ? 'page' : undefined}>{l.label}</Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2.5 lg:flex">
          <Button type="button" variant="outline" size="icon" className="ui-transition active:scale-95" onClick={toggleTheme} aria-label="Cambiar tema">
            {themeIcon}
          </Button>
          {showAccountButtons && (
            <>
              <Link to="/login" className="rounded-lg border border-[var(--color-landing-border)] px-4 py-2 text-sm font-medium landing-text ui-transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-[0.97]">
                Iniciar sesión
              </Link>
              <Link to="/registro" className="rounded-lg bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-[var(--color-primary-foreground)] ui-transition hover:bg-[var(--color-primary)]/90 hover:shadow-sm active:scale-[0.97]">
                Registrarse
              </Link>
            </>
          )}
          {variant === 'auth' && (
            <Link to="/" className="text-sm font-medium landing-text-muted ui-transition hover:text-[var(--color-primary)] px-3 py-2 rounded-md hover:bg-[var(--color-landing-card-muted)]/40">
              Volver al inicio
            </Link>
          )}
        </div>

        {/* Mobile toggle */}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="landing-text lg:hidden ui-transition active:scale-95"
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
          className="border-t border-[var(--color-landing-border)] bg-[var(--color-landing-bg)] px-4 pb-6 pt-4 lg:hidden animate-in fade-in slide-in-from-top-4 duration-150 ease-out"
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
              <Link key={l.to} to={l.to} className={cn('rounded-lg px-3 py-2.5 transition hover:bg-[var(--color-landing-card-muted)]', navLinkClass(l.to))} onClick={() => setMobileOpen(false)}>
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
              <Button type="button" variant="outline" size="icon" className="ui-transition active:scale-95" onClick={toggleTheme} aria-label="Cambiar tema">
                {themeIcon}
              </Button>
            </div>
            {showAccountButtons && (
              <>
                <Link to="/login" className="rounded-lg border border-[var(--color-landing-border)] px-4 py-2.5 text-center text-sm font-medium landing-text ui-transition hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 active:scale-[0.97]" onClick={() => setMobileOpen(false)}>
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="rounded-lg bg-[var(--color-primary)] px-4 py-2.5 text-center text-sm font-medium text-[var(--color-primary-foreground)] ui-transition hover:bg-[var(--color-primary)]/90 hover:shadow-sm active:scale-[0.97]" onClick={() => setMobileOpen(false)}>
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
