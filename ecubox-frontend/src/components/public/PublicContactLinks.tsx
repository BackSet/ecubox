import type { ReactNode } from 'react';
import { Mail, Phone } from 'lucide-react';
import { useCanalesComunicacionPublic } from '@/hooks/useCanalesComunicacion';
import {
  getSocialBrandStyle,
  SocialBrandIcon,
} from '@/components/public/SocialBrandIcon';
import {
  CANAL_LABELS,
  hasPublicCanales,
  type CanalComunicacionKey,
  type CanalesComunicacionPublic,
} from '@/types/canales-comunicacion';
import { cn } from '@/lib/utils';

const SOCIAL_KEYS: CanalComunicacionKey[] = [
  'whatsapp',
  'facebook',
  'instagram',
  'tiktok',
  'youtube',
  'linkedin',
  'x',
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

function getPublicValor(canales: CanalesComunicacionPublic, key: CanalComunicacionKey): string | null {
  const v = canales[key as keyof CanalesComunicacionPublic];
  if (typeof v !== 'string') return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function SectionBlock({
  title,
  children,
  landing = false,
}: {
  title: string;
  children: ReactNode;
  landing?: boolean;
}) {
  return (
    <div>
      <h4
        className={cn(
          'mb-2.5 text-[11px] font-semibold uppercase tracking-wider',
          landing ? 'landing-text-muted' : 'text-[var(--color-muted-foreground)]',
        )}
      >
        {title}
      </h4>
      {children}
    </div>
  );
}

function ContactRow({
  canal,
  valor,
  compact = false,
  landing = false,
}: {
  canal: 'email' | 'telefono';
  valor: string;
  compact?: boolean;
  landing?: boolean;
}) {
  const style = getSocialBrandStyle(canal);
  const Icon = canal === 'email' ? Mail : Phone;

  return (
    <a
      href={buildHref(canal, valor)}
      className={cn(
        'group inline-flex min-w-0 items-center gap-3 rounded-xl ring-1 transition-all duration-200',
        style.bg,
        style.ring,
        style.hover,
        compact ? 'w-full px-3 py-2.5' : 'px-3.5 py-3',
      )}
    >
      <span
        className={cn(
          'inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/70 shadow-sm dark:bg-black/20',
          style.text,
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block text-[10px] font-semibold uppercase tracking-wider',
            landing ? 'landing-text-muted' : 'text-[var(--color-muted-foreground)]',
          )}
        >
          {CANAL_LABELS[canal]}
        </span>
        <span
          className={cn(
            'block truncate text-sm font-medium group-hover:text-[var(--color-primary)]',
            landing ? 'landing-text' : 'text-[var(--color-foreground)]',
          )}
        >
          {valor}
        </span>
      </span>
    </a>
  );
}

function SocialButton({
  canal,
  valor,
  size = 'md',
}: {
  canal: CanalComunicacionKey;
  valor: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const style = getSocialBrandStyle(canal);
  const sizeClass =
    size === 'lg' ? 'size-12 rounded-2xl' : size === 'sm' ? 'size-9 rounded-xl' : 'size-11 rounded-xl';
  const isExternal = canal !== 'email' && canal !== 'telefono';

  return (
    <a
      href={buildHref(canal, valor)}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      title={CANAL_LABELS[canal]}
      aria-label={CANAL_LABELS[canal]}
      className={cn(
        'inline-flex items-center justify-center ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        sizeClass,
        style.bg,
        style.text,
        style.ring,
        style.hover,
      )}
    >
      <SocialBrandIcon canal={canal} className={size === 'lg' ? 'size-6' : 'size-5'} />
    </a>
  );
}

function SocialCard({
  canal,
  valor,
  landing = false,
}: {
  canal: CanalComunicacionKey;
  valor: string;
  landing?: boolean;
}) {
  const style = getSocialBrandStyle(canal);

  return (
    <a
      href={buildHref(canal, valor)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex min-w-[9.5rem] flex-1 items-center gap-3 rounded-xl px-3.5 py-3 ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:min-w-[10.5rem]',
        style.bg,
        style.ring,
        style.hover,
      )}
    >
      <span
        className={cn(
          'inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/75 shadow-sm dark:bg-black/25',
          style.text,
        )}
      >
        <SocialBrandIcon canal={canal} />
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            'block text-sm font-semibold',
            landing ? 'landing-text' : 'text-[var(--color-foreground)]',
          )}
        >
          {CANAL_LABELS[canal]}
        </span>
        <span
          className={cn(
            'block text-[11px] group-hover:text-[var(--color-primary)]',
            landing ? 'landing-text-muted' : 'text-[var(--color-muted-foreground)]',
          )}
        >
          Abrir enlace
        </span>
      </span>
    </a>
  );
}

function SocialChip({
  canal,
  valor,
}: {
  canal: CanalComunicacionKey;
  valor: string;
}) {
  const style = getSocialBrandStyle(canal);
  const isExternal = canal !== 'email' && canal !== 'telefono';

  return (
    <a
      href={buildHref(canal, valor)}
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        'group inline-flex items-center gap-2.5 rounded-full px-4 py-2 ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm',
        style.bg,
        style.ring,
        style.hover,
      )}
    >
      <span
        className={cn(
          'inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-white/75 dark:bg-black/25',
          style.text,
        )}
      >
        <SocialBrandIcon canal={canal} className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-semibold uppercase tracking-wider landing-text-muted">
          {CANAL_LABELS[canal]}
        </span>
        <span className="block max-w-[12rem] truncate text-sm font-medium landing-text group-hover:text-[var(--color-primary)] sm:max-w-none">
          {isExternal ? 'Abrir enlace' : valor}
        </span>
      </span>
    </a>
  );
}

function SocialBandItem({
  canal,
  valor,
}: {
  canal: CanalComunicacionKey;
  valor: string;
}) {
  const style = getSocialBrandStyle(canal);

  return (
    <a
      href={buildHref(canal, valor)}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'group flex flex-col items-center gap-2 rounded-2xl px-4 py-3 ring-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md',
        style.bg,
        style.ring,
        style.hover,
      )}
    >
      <span
        className={cn(
          'inline-flex size-12 items-center justify-center rounded-xl bg-white/75 shadow-sm dark:bg-black/25',
          style.text,
        )}
      >
        <SocialBrandIcon canal={canal} className="size-6" />
      </span>
      <span className="text-xs font-semibold landing-text">{CANAL_LABELS[canal]}</span>
    </a>
  );
}

export interface PublicContactLinksProps {
  canales?: CanalesComunicacionPublic;
  variant?: 'footer' | 'footer-band' | 'inline' | 'compact' | 'landing';
  className?: string;
}

export function PublicContactLinks({
  canales: canalesProp,
  variant = 'inline',
  className,
}: PublicContactLinksProps) {
  const { data, isLoading, isError } = useCanalesComunicacionPublic({
    enabled: canalesProp === undefined,
  });
  const canales = canalesProp ?? data;

  if (canalesProp === undefined && isLoading) return null;
  if (!canales || isError) return null;
  if (!hasPublicCanales(canales)) return null;

  const email = getPublicValor(canales, 'email');
  const telefono = getPublicValor(canales, 'telefono');
  const socials = SOCIAL_KEYS.map((key) => {
    const valor = getPublicValor(canales, key);
    return valor ? { key, valor } : null;
  }).filter(Boolean) as { key: CanalComunicacionKey; valor: string }[];

  if (!email && !telefono && socials.length === 0) {
    return null;
  }

  if (variant === 'footer-band') {
    return (
      <div className={cn('space-y-5', className)}>
        {(email || telefono) && (
          <div className="flex flex-wrap justify-center gap-2.5 md:justify-start">
            {email && <SocialChip canal="email" valor={email} />}
            {telefono && <SocialChip canal="telefono" valor={telefono} />}
          </div>
        )}
        {socials.length > 0 && (
          <div className="flex flex-wrap justify-center gap-3 md:justify-start">
            {socials.map(({ key, valor }) => (
              <SocialBandItem key={key} canal={key} valor={valor} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={cn('space-y-4', className)}>
        {(email || telefono) && (
          <SectionBlock title="Contacto" landing>
            <ul className="flex flex-col gap-2">
              {email && (
                <li>
                  <ContactRow canal="email" valor={email} compact landing />
                </li>
              )}
              {telefono && (
                <li>
                  <ContactRow canal="telefono" valor={telefono} compact landing />
                </li>
              )}
            </ul>
          </SectionBlock>
        )}
        {socials.length > 0 && (
          <SectionBlock title="Síguenos" landing>
            <div className="flex flex-wrap gap-2.5">
              {socials.map(({ key, valor }) => (
                <SocialButton key={key} canal={key} valor={valor} size="lg" />
              ))}
            </div>
          </SectionBlock>
        )}
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {email && <SocialButton canal="email" valor={email} size="sm" />}
        {telefono && <SocialButton canal="telefono" valor={telefono} size="sm" />}
        {socials.map(({ key, valor }) => (
          <SocialButton key={key} canal={key} valor={valor} size="sm" />
        ))}
      </div>
    );
  }

  if (variant === 'landing') {
    return (
      <div className={cn('space-y-5', className)}>
        {(email || telefono) && (
          <SectionBlock title="Contacto directo" landing>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {email && <ContactRow canal="email" valor={email} landing />}
              {telefono && <ContactRow canal="telefono" valor={telefono} landing />}
            </div>
          </SectionBlock>
        )}
        {socials.length > 0 && (
          <SectionBlock title="Redes sociales" landing>
            <div className="flex flex-wrap gap-2.5">
              {socials.map(({ key, valor }) => (
                <SocialCard key={key} canal={key} valor={valor} landing />
              ))}
            </div>
          </SectionBlock>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {(email || telefono) && (
        <SectionBlock title="Contacto directo">
          <div className="grid gap-2 sm:grid-cols-2">
            {email && <ContactRow canal="email" valor={email} />}
            {telefono && <ContactRow canal="telefono" valor={telefono} />}
          </div>
        </SectionBlock>
      )}
      {socials.length > 0 && (
        <SectionBlock title="Redes sociales">
          <div className="flex flex-wrap gap-2.5">
            {socials.map(({ key, valor }) => (
              <SocialCard key={key} canal={key} valor={valor} />
            ))}
          </div>
        </SectionBlock>
      )}
    </div>
  );
}

