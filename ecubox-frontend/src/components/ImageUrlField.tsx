import { type ReactNode, useEffect, useState } from 'react';
import { Image as ImageIcon, ImageOff, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface ImageUrlFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Texto alternativo (para el preview y la accesibilidad de la imagen). */
  alt?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  /** Indicador de obligatoriedad (Opcional / Obligatorio para publicar…). */
  badge?: ReactNode;
}

/**
 * Campo reutilizable de URL de imagen con vista previa 16:9, limpiar, error,
 * skeleton de carga y fallback controlado (sin el icono de imagen rota del
 * navegador). Usa solo tokens del tema (se adapta a claro/oscuro).
 */
export function ImageUrlField({
  id,
  label,
  value,
  onChange,
  alt,
  placeholder = 'https://…',
  hint,
  error,
  badge,
}: ImageUrlFieldProps) {
  const url = value.trim();
  const tieneUrl = url.length > 0;
  const [cargando, setCargando] = useState(false);
  const [falloCarga, setFalloCarga] = useState(false);

  // Reinicia el estado de carga/fallo cada vez que cambia la URL.
  useEffect(() => {
    setFalloCarga(false);
    setCargando(tieneUrl);
  }, [url, tieneUrl]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="flex items-center gap-1.5 text-xs text-[var(--color-foreground)]">
          <ImageIcon className="h-3.5 w-3.5 text-[var(--color-muted-foreground)]" aria-hidden />
          <span>{label}</span>
          {badge}
        </Label>
        {tieneUrl && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="ui-interactive inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden />
            Limpiar
          </button>
        )}
      </div>

      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        inputMode="url"
      />

      {error ? (
        <p role="alert" className="text-[11px] text-[var(--color-destructive)]">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}

      {/* Vista previa 16:9 (relación reservada para evitar layout shift). */}
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-landing-card-muted)]">
        {!tieneUrl ? (
          <Placeholder icon={<ImageIcon className="h-5 w-5" />} texto="Sin imagen" />
        ) : falloCarga ? (
          <Placeholder icon={<ImageOff className="h-5 w-5" />} texto="No se pudo cargar la imagen" />
        ) : (
          <>
            {cargando && <div className="absolute inset-0 animate-pulse bg-[var(--color-muted)]/50" aria-hidden />}
            <img
              src={url}
              alt={alt?.trim() ? alt : 'Vista previa de la imagen'}
              loading="lazy"
              decoding="async"
              onLoad={() => setCargando(false)}
              onError={() => {
                setCargando(false);
                setFalloCarga(true);
              }}
              className={cn('h-full w-full object-cover', cargando && 'opacity-0')}
            />
          </>
        )}
      </div>
    </div>
  );
}

function Placeholder({ icon, texto }: { icon: ReactNode; texto: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
      {icon}
      <span className="text-[11px]">{texto}</span>
    </div>
  );
}
