import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';

export interface LabeledFieldProps {
  label: ReactNode;
  required?: boolean;
  error?: string | null;
  hint?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
}

/**
 * Campo etiquetado canonico para formularios.
 * - Label con icono opcional y marca de requerido.
 * - Slot de control (`children`).
 * - Mensaje de error o hint.
 *
 * Este es el reemplazo del antiguo `FormField` local que se duplicaba
 * en cada formulario (UsuarioForm, DestinatarioForm, etc.).
 */
export function LabeledField({
  label,
  required,
  error,
  hint,
  icon,
  children,
}: LabeledFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5 text-xs text-[var(--color-foreground)]">
        {icon && <span className="text-[var(--color-muted-foreground)]">{icon}</span>}
        <span>{label}</span>
        {required && <span className="text-[var(--color-destructive)]">*</span>}
      </Label>
      {children}
      {error ? (
        <p className="flex items-center gap-1 text-xs text-[var(--color-destructive)]">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      ) : hint ? (
        <p className="text-[11px] text-[var(--color-muted-foreground)]">{hint}</p>
      ) : null}
    </div>
  );
}
