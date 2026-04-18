import { Lock, Unlock } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * Indica si el envio consolidado esta abierto (admite cambios) o cerrado
 * (historico). Reemplaza al badge de la antigua maquina de estados.
 */
export function EnvioConsolidadoBadge({ cerrado }: { cerrado: boolean }) {
  const Icon = cerrado ? Lock : Unlock;
  return (
    <StatusBadge tone={cerrado ? 'neutral' : 'success'}>
      <Icon className="h-3 w-3" />
      {cerrado ? 'Cerrado' : 'Abierto'}
    </StatusBadge>
  );
}
