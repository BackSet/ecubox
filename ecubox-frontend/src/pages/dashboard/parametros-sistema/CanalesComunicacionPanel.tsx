import type { ComponentType, Dispatch, SetStateAction } from 'react';
import { Link2, Mail, MessageCircle, Phone, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SurfaceCard } from '@/components/ui/surface-card';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';
import {
  CANAL_KEYS,
  CANAL_LABELS,
  CANAL_PLACEHOLDERS,
  type CanalComunicacionKey,
  type CanalesComunicacion,
} from '@/types/canales-comunicacion';
import { cn } from '@/lib/utils';

const CANAL_ICONS: Partial<Record<CanalComunicacionKey, ComponentType<{ className?: string }>>> = {
  email: Mail,
  telefono: Phone,
  whatsapp: MessageCircle,
  facebook: Link2,
  instagram: Link2,
  tiktok: Link2,
  youtube: Link2,
  linkedin: Link2,
  x: Link2,
};

export interface CanalesComunicacionPanelProps {
  loading: boolean;
  error: Error | null;
  canalesLocal: CanalesComunicacion;
  setCanalesLocal: Dispatch<SetStateAction<CanalesComunicacion>>;
  dirty: boolean;
  saving: boolean;
  canWrite: boolean;
  onSave: () => void | Promise<void>;
}

export function CanalesComunicacionPanel({
  loading,
  error,
  canalesLocal,
  setCanalesLocal,
  dirty,
  saving,
  canWrite,
  onSave,
}: CanalesComunicacionPanelProps) {
  const updateCanal = (key: CanalComunicacionKey, patch: Partial<{ valor: string; visible: boolean }>) => {
    setCanalesLocal((prev) => {
      const current = prev[key];
      const valor = patch.valor !== undefined ? patch.valor : current.valor;
      const trimmed = valor.trim();
      const visible =
        patch.visible !== undefined
          ? patch.visible && trimmed.length > 0
          : trimmed.length > 0
            ? current.visible
            : false;
      return {
        ...prev,
        [key]: { valor, visible: trimmed.length > 0 ? visible : false },
      };
    });
  };

  const publicPreview = CANAL_KEYS.filter(
    (k) => canalesLocal[k].valor.trim() && canalesLocal[k].visible,
  );

  if (loading) {
    return <FormSkeleton fields={6} />;
  }

  if (error) {
    return (
      <div role="alert" className="ui-alert ui-alert-error">
        No se pudo cargar la configuración. Intenta de nuevo.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <SurfaceCard className="p-4 sm:p-5">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          Configura los canales de contacto y redes sociales que verán los visitantes en la landing,
          rastreo, casillero y el pie de página. Puedes guardar un enlace y ocultarlo hasta que quieras
          publicarlo.
        </p>
      </SurfaceCard>

      <div className="grid gap-3">
        {CANAL_KEYS.map((key) => {
          const item = canalesLocal[key];
          const Icon = CANAL_ICONS[key];
          const hasValor = item.valor.trim().length > 0;
          const willShowPublic = hasValor && item.visible;

          return (
            <SurfaceCard key={key} className="p-4 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-center gap-2">
                    {Icon && (
                      <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                        <Icon className="size-4" aria-hidden />
                      </span>
                    )}
                    <Label htmlFor={`canal-${key}`} className="text-sm font-semibold">
                      {CANAL_LABELS[key]}
                    </Label>
                    {willShowPublic && (
                      <span className="rounded border border-[var(--color-primary)]/25 bg-[var(--color-primary)]/8 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary)]">
                        Visible en sitio
                      </span>
                    )}
                  </div>
                  <Input
                    id={`canal-${key}`}
                    type={key === 'email' ? 'email' : 'text'}
                    value={item.valor}
                    onChange={(e) => updateCanal(key, { valor: e.target.value })}
                    placeholder={CANAL_PLACEHOLDERS[key]}
                    className="font-mono text-sm"
                    disabled={!canWrite}
                  />
                  {key !== 'email' && key !== 'telefono' && (
                    <p className="text-[11px] text-[var(--color-muted-foreground)]">
                      URL completa con https:// (WhatsApp puede ser enlace wa.me o número)
                    </p>
                  )}
                </div>
                <div
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-lg border border-[var(--color-border)] px-3 py-2 sm:flex-col sm:items-end sm:gap-1.5',
                    !hasValor && 'opacity-50',
                  )}
                >
                  <Label
                    htmlFor={`canal-visible-${key}`}
                    className="text-xs text-[var(--color-muted-foreground)] sm:text-right"
                  >
                    Mostrar en sitio público
                  </Label>
                  <Switch
                    id={`canal-visible-${key}`}
                    checked={hasValor && item.visible}
                    disabled={!canWrite || !hasValor}
                    onCheckedChange={(checked) => updateCanal(key, { visible: checked })}
                  />
                </div>
              </div>
            </SurfaceCard>
          );
        })}
      </div>

      <SurfaceCard className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-[var(--color-foreground)]">Vista previa pública</h3>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
          Así se verán los canales en el footer y páginas públicas tras guardar.
        </p>
        {publicPreview.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">
            Ningún canal visible. Activa &quot;Mostrar&quot; en al menos un canal con valor.
          </p>
        ) : (
          <ul className="mt-3 flex flex-wrap gap-2">
            {publicPreview.map((key) => (
              <li
                key={key}
                className="rounded-md border border-[var(--color-border)] bg-[var(--color-muted)]/30 px-2.5 py-1 text-xs font-medium"
              >
                {CANAL_LABELS[key]}
              </li>
            ))}
          </ul>
        )}
      </SurfaceCard>

      <div className="flex justify-end">
        <Button type="button" disabled={!canWrite || !dirty || saving} onClick={() => void onSave()}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </div>
    </div>
  );
}
