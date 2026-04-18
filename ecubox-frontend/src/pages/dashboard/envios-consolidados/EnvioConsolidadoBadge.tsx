import { Lock, Unlock } from 'lucide-react';

/**
 * Indica si el envio consolidado esta abierto (admite cambios) o cerrado
 * (historico). Reemplaza al badge de la antigua maquina de estados.
 *
 * Convencion visual:
 *  - Abierto = verde con candado abierto (admite cambios, estado activo).
 *  - Cerrado = gris con candado cerrado (historico, no admite cambios).
 */
export function EnvioConsolidadoBadge({ cerrado }: { cerrado: boolean }) {
  const label = cerrado ? 'Cerrado' : 'Abierto';
  const color = cerrado
    ? 'border-border bg-[var(--color-muted)] text-muted-foreground'
    : 'border-[var(--color-success)]/30 bg-[var(--color-success)]/10 text-[var(--color-success)]';
  const Icon = cerrado ? Lock : Unlock;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}
