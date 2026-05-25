import type { MetaDescriptor } from '@tanstack/react-router';
import type { CanalesComunicacionPublic } from '@/types/canales-comunicacion';

/**
 * URL pública del sitio (sin barra final) para canonical, Open Graph y JSON-LD.
 * Definir VITE_PUBLIC_SITE_URL en producción; en desarrollo se usa el origin actual o localhost.
 */
export function getPublicSiteOrigin(): string {
  const raw = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  if (raw) return raw.replace(/\/$/, '');
  if (import.meta.env.DEV) {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'http://localhost:5173';
  }
  return 'https://ecubox.org';
}

/** Ruta que empieza por / (ej. `/tracking`). */
export function absoluteUrl(path: string): string {
  const origin = getPublicSiteOrigin();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${p}`;
}

export const SEO_DEFAULT_TITLE = 'ECUBOX | Casillero USA y envíos a Ecuador';
export const SEO_DEFAULT_DESCRIPTION =
  'ECUBOX: casillero en Estados Unidos, envíos a Ecuador, rastreo por pieza y tarifas transparentes. Tus compras en USA llegan a casa.';

export const OG_IMAGE_PATH = '/og-image.png';

export function absoluteOgImageUrl(): string {
  return absoluteUrl(OG_IMAGE_PATH);
}

export type PublicSeoPayload = {
  title: string;
  description: string;
  path: string;
};

/**
 * Meta y links comunes para rutas públicas (Open Graph, Twitter, canonical).
 * TanStack Router espera objetos planos en `meta` (name/content, property/content, title, script:ld+json).
 */
export function buildPublicPageHead(payload: PublicSeoPayload): {
  meta: MetaDescriptor[];
  links: Array<{ rel: 'canonical'; href: string }>;
} {
  const url = absoluteUrl(payload.path);
  const image = absoluteOgImageUrl();
  const meta: MetaDescriptor[] = [
    { title: payload.title },
    { name: 'description', content: payload.description },
    { property: 'og:title', content: payload.title },
    { property: 'og:description', content: payload.description },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: url },
    { property: 'og:locale', content: 'es_EC' },
    { property: 'og:image', content: image },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: payload.title },
    { name: 'twitter:description', content: payload.description },
    { name: 'twitter:image', content: image },
  ];
  const links = [{ rel: 'canonical' as const, href: url }];
  return { meta, links };
}

function buildSameAsFromCanales(canales: CanalesComunicacionPublic | undefined): string[] {
  if (!canales) return [];
  const urls: string[] = [];
  const keys = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'x', 'whatsapp'] as const;
  for (const key of keys) {
    const v = canales[key];
    if (typeof v === 'string' && v.trim().startsWith('http')) {
      urls.push(v.trim());
    }
  }
  return urls;
}

function buildContactPointFromCanales(canales: CanalesComunicacionPublic | undefined) {
  if (!canales) return undefined;
  const email = typeof canales.email === 'string' ? canales.email.trim() : '';
  const telefono = typeof canales.telefono === 'string' ? canales.telefono.trim() : '';
  if (!email && !telefono) return undefined;
  return {
    '@type': 'ContactPoint',
    contactType: 'customer service',
    ...(email ? { email } : {}),
    ...(telefono ? { telephone: telefono } : {}),
    availableLanguage: ['Spanish'],
  };
}

export function buildHomeJsonLd(
  canales?: CanalesComunicacionPublic,
): [MetaDescriptor, MetaDescriptor] {
  const origin = getPublicSiteOrigin();
  const sameAs = buildSameAsFromCanales(canales);
  const contactPoint = buildContactPointFromCanales(canales);
  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ECUBOX',
    url: origin,
    description: SEO_DEFAULT_DESCRIPTION,
    logo: `${origin}/favicon.svg`,
  };
  if (sameAs.length > 0) org.sameAs = sameAs;
  if (contactPoint) org.contactPoint = contactPoint;
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'ECUBOX',
    url: origin,
    description: SEO_DEFAULT_DESCRIPTION,
    publisher: { '@type': 'Organization', name: 'ECUBOX' },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${origin}/tracking?codigo={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
  return [
    { 'script:ld+json': org },
    { 'script:ld+json': website },
  ];
}
