import { useState, type MouseEvent } from 'react';
import { Check, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export interface MonoTruncProps {
  value: string | null | undefined;
  /** Caracteres iniciales conservados al truncar. Default 6. */
  head?: number;
  /** Caracteres finales conservados al truncar. Default 6. */
  tail?: number;
  /** Mostrar bot\u00f3n copiar inline al hover. Default true. */
  copy?: boolean;
  /** Renderizar como link en lugar de span. */
  as?: 'span' | 'a';
  href?: string;
  /** Tooltip personalizado (default: el value completo). */
  title?: string;
  /** Extiende el className del texto. */
  className?: string;
  /** Texto a mostrar cuando value est\u00e1 vac\u00edo. Default: em-dash. */
  emptyLabel?: string;
  /** Click handler para el caso `as="a"` con onClick custom. */
  onLinkClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  /** Solo renderiza el bot\u00f3n copiar con tooltip; \u00fatil al lado de otro texto. */
  iconOnly?: boolean;
}

/**
 * Renderiza un c\u00f3digo monoespaciado. Si su longitud supera `head + tail + 1`
 * lo trunca por el medio (`123456\u20269385035`) conservando inicio y final.
 * Mantiene tooltip con el valor completo y, opcionalmente, un bot\u00f3n copiar
 * inline visible al hover de la fila.
 */
export function MonoTrunc({
  value,
  head = 6,
  tail = 6,
  copy = true,
  as = 'span',
  href,
  title,
  className,
  emptyLabel = '\u2014',
  onLinkClick,
  iconOnly = false,
}: MonoTruncProps) {
  const v = (value ?? '').trim();
  if (!v) {
    return <span className="text-xs italic text-muted-foreground">{emptyLabel}</span>;
  }
  if (iconOnly) {
    return <CopyInline value={v} ariaLabel={title ?? `Copiar ${v}`} />;
  }

  const minToTruncate = head + tail + 1;
  const truncated = v.length > minToTruncate ? `${v.slice(0, head)}\u2026${v.slice(-tail)}` : v;
  const wasTruncated = truncated !== v;

  const textClass = cn(
    'whitespace-nowrap font-mono text-sm tabular-nums',
    className,
  );

  const inner = as === 'a' && href ? (
    <a
      href={href}
      onClick={onLinkClick}
      className={cn(textClass, 'hover:underline')}
      title={title ?? v}
    >
      {truncated}
    </a>
  ) : (
    <span className={textClass} title={title ?? v}>
      {truncated}
    </span>
  );

  return (
    <span className="inline-flex min-w-0 items-center gap-1">
      {inner}
      {copy && <CopyInline value={v} ariaLabel={wasTruncated ? `Copiar valor completo` : 'Copiar'} />}
    </span>
  );
}

function CopyInline({ value, ariaLabel }: { value: string; ariaLabel: string }) {
  const [copied, setCopied] = useState(false);
  const handle = async (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('No se pudo copiar');
    }
  };
  return (
    <button
      type="button"
      onClick={handle}
      aria-label={ariaLabel}
      title={`${ariaLabel}: ${value}`}
      className="shrink-0 rounded p-0.5 text-muted-foreground opacity-60 transition-opacity hover:bg-[var(--color-muted)] hover:text-foreground hover:opacity-100"
    >
      {copied ? (
        <Check className="h-3 w-3 text-[var(--color-success)]" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </button>
  );
}
