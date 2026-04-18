import { Inbox } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { EmptyState } from '@/components/EmptyState';
import { InicioClienteSection } from './inicio/InicioClienteSection';
import { InicioOperarioSection } from './inicio/InicioOperarioSection';

const PERMISOS_OPERARIO = [
  'GUIAS_MASTER_READ',
  'PAQUETES_PESO_WRITE',
  'PAQUETES_READ',
  'DESPACHOS_WRITE',
  'ENVIOS_CONSOLIDADOS_READ',
] as const;

export function DashboardPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const showCliente = hasPermission('MIS_GUIAS_READ');
  const showOperario = PERMISOS_OPERARIO.some((p) => hasPermission(p));

  if (!showCliente && !showOperario) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Inbox}
          title="Sin información disponible"
          description="Tu usuario no tiene módulos habilitados todavía. Contacta al administrador."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {showCliente && <InicioClienteSection />}
      {showCliente && showOperario && (
        <hr className="border-[var(--color-border)]" />
      )}
      {showOperario && <InicioOperarioSection />}
    </div>
  );
}
