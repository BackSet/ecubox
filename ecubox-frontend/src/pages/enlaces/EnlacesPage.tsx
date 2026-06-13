import { useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { QRCodeSVG } from 'qrcode.react';
import {
  Calculator,
  Check,
  ChevronRight,
  Copy,
  Download,
  type LucideIcon,
  LogIn,
  Mail,
  Monitor,
  Moon,
  PackageSearch,
  Phone,
  Share2,
  Sun,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EcuboxLogo } from '@/components/brand';
import { useThemeStore } from '@/stores/themeStore';
import {
  getSocialBrandStyle,
  SocialBrandIcon,
} from '@/components/public/SocialBrandIcon';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';
import {
  CANAL_LABELS,
  type CanalComunicacionKey,
  type CanalesComunicacionPublic,
} from '@/types/canales-comunicacion';
import { absoluteUrl } from '@/lib/seo';
import { notify } from '@/lib/notify';
import { copyText } from '@/lib/clipboard';
import { downloadBlob } from '@/lib/download';
import { cn } from '@/lib/utils';

/** Orden y subtítulos de los canales configurables en el sistema. */
const CONTACT_KEYS: CanalComunicacionKey[] = ['whatsapp', 'telefono', 'email'];
const SOCIAL_KEYS: CanalComunicacionKey[] = [
  'instagram',
  'facebook',
  'tiktok',
  'youtube',
  'linkedin',
  'x',
];

const CANAL_SUBTITULO: Partial<Record<CanalComunicacionKey, string>> = {
  whatsapp: 'Escríbenos por WhatsApp',
  telefono: 'Llámanos directamente',
  email: 'Envíanos un correo',
  instagram: 'Síguenos en Instagram',
  facebook: 'Síguenos en Facebook',
  tiktok: 'Míranos en TikTok',
  youtube: 'Suscríbete en YouTube',
  linkedin: 'Conéctate en LinkedIn',
  x: 'Síguenos en X',
};

/** Enlaces internos del producto que tiene sentido destacar aquí. */
const INTERNAL_LINKS: {
  to: string;
  label: string;
  subtitle: string;
  icon: LucideIcon;
}[] = [
  {
    to: '/tracking',
    label: 'Rastrear mi paquete',
    subtitle: 'Sigue tu envío en tiempo real',
    icon: PackageSearch,
  },
  {
    to: '/calculadora',
    label: 'Calculadora de tarifas',
    subtitle: 'Cotiza tu envío USA → Ecuador',
    icon: Calculator,
  },
  {
    to: '/registro',
    label: 'Crear cuenta gratis',
    subtitle: 'Obtén tu casillero en USA',
    icon: UserPlus,
  },
  {
    to: '/login',
    label: 'Iniciar sesión',
    subtitle: 'Accede a tu panel ECUBOX',
    icon: LogIn,
  },
];

function buildHref(key: CanalComunicacionKey, valor: string): string {
  if (key === 'email') return `mailto:${valor}`;
  if (key === 'telefono') return `tel:${valor.replace(/\s/g, '')}`;
  if (key === 'whatsapp' && !/^https?:\/\//i.test(valor)) {
    const digits = valor.replace(/\D/g, '');
    return digits ? `https://wa.me/${digits}` : valor;
  }
  return valor;
}

function getValor(
  canales: CanalesComunicacionPublic | undefined,
  key: CanalComunicacionKey,
): string | null {
  if (!canales) return null;
  const v = canales[key as keyof CanalesComunicacionPublic];
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Botón apilado de ancho completo, estilo "link in bio". */
function LinkRow({
  href,
  to,
  icon,
  label,
  subtitle,
  brand,
}: {
  href?: string;
  to?: string;
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  brand?: { bg: string; text: string; ring: string; hover: string };
}) {
  const className = cn(
    'group flex items-center gap-3.5 rounded-2xl px-4 py-3.5 ring-1 transition-[transform,box-shadow,border-color,background-color,color] [transition-duration:var(--motion-normal)] [transition-timing-function:var(--motion-ease-standard)] hover:-translate-y-0.5 hover:shadow-md',
    brand
      ? cn(brand.bg, brand.ring, brand.hover)
      : 'bg-[var(--color-landing-card)] ring-[var(--color-landing-border)] hover:bg-[var(--color-landing-card-muted)]',
  );

  const inner = (
    <>
      <span
        className={cn(
          'inline-flex size-11 shrink-0 items-center justify-center rounded-xl shadow-sm',
          brand
            ? cn('bg-white/75 dark:bg-black/25', brand.text)
            : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]',
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-semibold landing-text">{label}</span>
        {subtitle ? (
          <span className="block truncate text-[12px] landing-text-muted">{subtitle}</span>
        ) : null}
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  );
}

export function EnlacesPage() {
  const { canales } = usePublicCanalesDisponibles();
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const ThemeIcon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun;
  const themeLabel =
    theme === 'dark' ? 'Tema oscuro' : theme === 'light' ? 'Tema claro' : 'Tema del sistema';

  const pageUrl = useMemo(() => absoluteUrl('/enlaces'), []);

  const contactos = useMemo(
    () =>
      CONTACT_KEYS.map((key) => {
        const valor = getValor(canales, key);
        return valor ? { key, valor } : null;
      }).filter(Boolean) as { key: CanalComunicacionKey; valor: string }[],
    [canales],
  );

  const redes = useMemo(
    () =>
      SOCIAL_KEYS.map((key) => {
        const valor = getValor(canales, key);
        return valor ? { key, valor } : null;
      }).filter(Boolean) as { key: CanalComunicacionKey; valor: string }[],
    [canales],
  );

  async function handleCopy() {
    try {
      await copyText(pageUrl);
      setCopied(true);
      notify.success('Enlace copiado al portapapeles');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      notify.error('No se pudo copiar el enlace');
    }
  }

  async function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'ECUBOX',
          text: 'Casillero en USA y envíos a Ecuador — todos nuestros enlaces.',
          url: pageUrl,
        });
      } catch {
        /* el usuario canceló: no es un error */
      }
      return;
    }
    void handleCopy();
  }

  function handleDownloadQr() {
    const svg = qrWrapRef.current?.querySelector('svg');
    if (!svg) return;
    const serialized = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' });
    downloadBlob(blob, 'ecubox-qr.svg');
  }

  return (
    <div className="landing-shell">
      <div className="landing-overlay" aria-hidden="true" />
      <main className="relative z-10 mobile-safe-inline flex flex-1 flex-col items-center py-10 sm:py-14">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Cambiar tema (actual: ${themeLabel})`}
        title={themeLabel}
        className="absolute right-4 top-4 z-20 inline-flex size-10 items-center justify-center rounded-full border border-[var(--color-landing-border)] bg-[var(--color-landing-card)] landing-text shadow-sm transition hover:bg-[var(--color-landing-card-muted)] hover:text-[var(--color-primary)]"
      >
        <ThemeIcon className="size-5" aria-hidden />
      </button>
      <div className="mx-auto w-full max-w-md space-y-6">
        {/* Encabezado */}
        <header className="flex flex-col items-center gap-3 text-center">
          <h1 className="sr-only">ECUBOX — Enlaces, contacto y redes</h1>
          <EcuboxLogo variant="principal" size="lg" asLink={false} />
          <p className="max-w-xs text-sm leading-relaxed landing-text-muted">
            Casillero en USA y envíos a Ecuador. Todos nuestros enlaces, contacto y redes en
            un solo lugar.
          </p>
        </header>

        {/* Enlaces destacados del producto */}
        <section className="space-y-2.5" aria-label="Enlaces destacados">
          {INTERNAL_LINKS.map(({ to, label, subtitle, icon: Icon }) => (
            <LinkRow
              key={to}
              to={to}
              label={label}
              subtitle={subtitle}
              icon={<Icon className="size-5" aria-hidden />}
            />
          ))}
        </section>

        {/* Contacto directo */}
        {contactos.length > 0 && (
          <section className="space-y-2.5" aria-label="Contacto directo">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider landing-text-muted">
              Contáctanos
            </h2>
            {contactos.map(({ key, valor }) => {
              const Icon = key === 'email' ? Mail : key === 'telefono' ? Phone : undefined;
              return (
                <LinkRow
                  key={key}
                  href={buildHref(key, valor)}
                  label={CANAL_LABELS[key]}
                  subtitle={CANAL_SUBTITULO[key]}
                  brand={getSocialBrandStyle(key)}
                  icon={
                    Icon ? (
                      <Icon className="size-5" aria-hidden />
                    ) : (
                      <SocialBrandIcon canal={key} className="size-5" />
                    )
                  }
                />
              );
            })}
          </section>
        )}

        {/* Redes sociales */}
        {redes.length > 0 && (
          <section className="space-y-2.5" aria-label="Redes sociales">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-wider landing-text-muted">
              Síguenos
            </h2>
            {redes.map(({ key, valor }) => (
              <LinkRow
                key={key}
                href={buildHref(key, valor)}
                label={CANAL_LABELS[key]}
                subtitle={CANAL_SUBTITULO[key]}
                brand={getSocialBrandStyle(key)}
                icon={<SocialBrandIcon canal={key} className="size-5" />}
              />
            ))}
          </section>
        )}

        {/* Código QR para compartir */}
        <section
          className="rounded-2xl border border-[var(--color-landing-border)] bg-[var(--color-landing-card)] p-5 text-center"
          aria-label="Compartir esta página"
        >
          <h2 className="text-sm font-semibold landing-text">Comparte esta página</h2>
          <p className="mt-1 text-[12px] landing-text-muted">
            Escanea el código o copia el enlace para compartir todos los accesos de ECUBOX.
          </p>
          <div
            ref={qrWrapRef}
            className="mx-auto mt-4 w-fit rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5"
          >
            <QRCodeSVG
              value={pageUrl}
              size={168}
              level="M"
              marginSize={0}
              bgColor="#ffffff"
              fgColor="#0f172a"
              title="Código QR de ECUBOX"
            />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button type="button" variant="primary" size="sm" onClick={handleShare}>
              <Share2 className="size-4" aria-hidden />
              Compartir
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Copy className="size-4" aria-hidden />
              )}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={handleDownloadQr}>
              <Download className="size-4" aria-hidden />
              Descargar QR
            </Button>
          </div>
        </section>

        {/* Pie mínimo: enlace discreto al sitio */}
        <footer className="pt-2 text-center">
          <Link
            to="/"
            className="text-xs font-medium landing-text-muted transition hover:text-[var(--color-primary)]"
          >
            Ir al sitio web de ECUBOX →
          </Link>
          <p className="mt-2 text-[11px] landing-text-muted">
            © ECUBOX {new Date().getFullYear()}
          </p>
        </footer>
      </div>
      </main>
    </div>
  );
}
