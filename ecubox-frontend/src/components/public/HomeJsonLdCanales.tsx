import { useEffect } from 'react';
import { useCanalesComunicacionPublic } from '@/hooks/useCanalesComunicacion';
import { buildHomeJsonLd } from '@/lib/seo';
import { hasPublicCanales } from '@/types/canales-comunicacion';

const SCRIPT_ID = 'ecubox-org-jsonld-canales';

/**
 * Enriquece el JSON-LD de Organization en la home con contactPoint y sameAs
 * cuando hay canales públicos configurados.
 */
export function HomeJsonLdCanales() {
  const { data } = useCanalesComunicacionPublic();

  useEffect(() => {
    if (!data || !hasPublicCanales(data)) return;

    const [orgDescriptor] = buildHomeJsonLd(data);
    const payload = (orgDescriptor as Record<string, unknown>)['script:ld+json'];
    if (!payload) return;

    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(payload);

    return () => {
      script?.remove();
    };
  }, [data]);

  return null;
}

