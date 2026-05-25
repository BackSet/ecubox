import { PublicContactLinks } from '@/components/public/PublicContactLinks';
import { usePublicCanalesDisponibles } from '@/hooks/useCanalesComunicacion';

/** Enlaces de contacto en páginas legales; no renderiza nada si no hay canales públicos. */
export function LegalContactBlock() {
  const { hasCanales, canales, isLoading, isError } = usePublicCanalesDisponibles();

  if (isLoading || isError || !hasCanales || !canales) {
    return null;
  }

  return (
    <div className="mt-3">
      <PublicContactLinks canales={canales} variant="inline" />
    </div>
  );
}
