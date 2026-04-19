import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { EmptyState } from '@/components/EmptyState';
import { InicioAdminSection } from './inicio/InicioAdminSection';
import { InicioClienteSection } from './inicio/InicioClienteSection';
import { InicioOperarioSection } from './inicio/InicioOperarioSection';

type Role = 'ADMIN' | 'OPERARIO' | 'CLIENTE';

const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Administración',
  OPERARIO: 'Operación',
  CLIENTE: 'Mis envíos',
};

const ROLE_ORDER: Role[] = ['ADMIN', 'OPERARIO', 'CLIENTE'];

export function DashboardPage() {
  const roles = useAuthStore((s) => s.roles);

  const availableRoles = ROLE_ORDER.filter((r) => roles.includes(r));
  const [activeRole, setActiveRole] = useState<Role | null>(availableRoles[0] ?? null);

  if (availableRoles.length === 0) {
    return (
      <div className="space-y-6">
        <EmptyState
          icon={Inbox}
          title="Sin información disponible"
          description="Tu usuario no tiene un rol con un inicio configurado. Contacta al administrador."
        />
      </div>
    );
  }

  const currentRole = activeRole && availableRoles.includes(activeRole)
    ? activeRole
    : availableRoles[0];

  return (
    <div className="space-y-4">
      {availableRoles.length > 1 && (
        <RoleSwitcher
          roles={availableRoles}
          active={currentRole}
          onChange={setActiveRole}
        />
      )}

      {currentRole === 'ADMIN' && <InicioAdminSection />}
      {currentRole === 'OPERARIO' && <InicioOperarioSection />}
      {currentRole === 'CLIENTE' && <InicioClienteSection />}
    </div>
  );
}

function RoleSwitcher({
  roles,
  active,
  onChange,
}: {
  roles: Role[];
  active: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Vista de inicio por rol"
      className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-1"
    >
      {roles.map((role) => {
        const isActive = role === active;
        return (
          <button
            key={role}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(role)}
            className={
              isActive
                ? 'inline-flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-3 py-1.5 text-sm font-medium text-[var(--color-primary-foreground)] shadow-sm transition'
                : 'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]'
            }
          >
            {ROLE_LABEL[role]}
          </button>
        );
      })}
    </div>
  );
}
