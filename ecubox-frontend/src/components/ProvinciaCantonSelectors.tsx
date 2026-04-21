import { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LabeledField } from '@/components/LabeledField';
import {
  PROVINCIAS_ECUADOR,
  getCantonesByProvincia,
} from '@/data/provincias-cantones-ecuador';

export interface ProvinciaCantonSelectorsProps {
  /** Valor actual de provincia (vacío = sin seleccionar). */
  provincia: string;
  /** Valor actual de cantón (vacío = sin seleccionar). */
  canton: string;
  /**
   * Callback cuando el usuario cambia la provincia. Recibe el nuevo valor de
   * provincia y un flag con el cantón sugerido (siempre `''` aquí, ya que se
   * resetea al cambiar provincia). El padre debe actualizar AMBOS campos.
   */
  onProvinciaChange: (nuevaProvincia: string, cantonReset: '') => void;
  /** Callback cuando el usuario cambia el cantón. */
  onCantonChange: (nuevoCanton: string) => void;
  /** Mensaje de error de validación de provincia. */
  errorProvincia?: string;
  /** Mensaje de error de validación de cantón. */
  errorCanton?: string;
  /** Marca ambos campos como obligatorios. */
  required?: boolean;
  /** Variante visual del trigger del Select (delegada a shadcn). */
  variant?: 'default' | 'clean';
  /** Clases extra para el contenedor grid. */
  className?: string;
  /** Texto del placeholder de provincia. */
  placeholderProvincia?: string;
  /** Texto del placeholder de cantón. */
  placeholderCanton?: string;
}

/**
 * Par de selectores Provincia + Cantón con dependencia jerárquica.
 *
 * Encapsula la lógica que estaba duplicada en `ConsignatarioForm`,
 * `AgenciaForm` y `PuntoEntregaForm`:
 *
 * - Lista de cantones derivada reactivamente de la provincia seleccionada.
 * - Match case-insensitive y trim para detectar cantones "fuera de catálogo"
 *   (cargados desde BD con grafías ligeramente distintas).
 * - Fix del bug de Radix Select: cuando la provincia llega por `form.reset()`
 *   en modo edición, el `<Select>` del cantón a veces no refleja el value
 *   porque sus `<SelectItem>` no estaban montados aún. Forzamos remount con
 *   `key` cuando cambia la provincia para garantizar que Radix recalcule
 *   su selección con los items correctos.
 * - Reset automático del cantón al cambiar provincia.
 */
export function ProvinciaCantonSelectors({
  provincia,
  canton,
  onProvinciaChange,
  onCantonChange,
  errorProvincia,
  errorCanton,
  required,
  variant = 'clean',
  className,
  placeholderProvincia = 'Seleccione provincia',
  placeholderCanton = 'Seleccione cantón',
}: ProvinciaCantonSelectorsProps) {
  const cantones = useMemo(() => getCantonesByProvincia(provincia ?? ''), [provincia]);

  // Match laxo (sin mayúsculas, sin espacios sobrantes) para no etiquetar
  // como "personalizado" un cantón que SÍ existe pero llegó con otra grafía.
  const cantonEnCatalogo = useMemo(() => {
    if (!canton) return true;
    const norm = (s: string) => s.trim().toLowerCase();
    const target = norm(canton);
    return cantones.some((c) => norm(c) === target);
  }, [cantones, canton]);

  return (
    <div className={className ?? 'grid grid-cols-1 gap-4 sm:grid-cols-2'}>
      <LabeledField label="Provincia" required={required} error={errorProvincia}>
        <Select
          value={provincia || undefined}
          onValueChange={(value) => onProvinciaChange(value, '')}
        >
          <SelectTrigger variant={variant} aria-invalid={Boolean(errorProvincia)}>
            <SelectValue placeholder={placeholderProvincia} />
          </SelectTrigger>
          <SelectContent>
            {PROVINCIAS_ECUADOR.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </LabeledField>

      <LabeledField
        label="Cantón"
        required={required}
        error={errorCanton}
        hint={!provincia ? 'Selecciona una provincia primero.' : undefined}
      >
        <Select
          // key fuerza remount cuando cambia provincia o cuando el cantón
          // se carga desde BD junto con los items: Radix Select recalcula
          // su selección con los <SelectItem> ya montados.
          key={`canton-${provincia || 'empty'}`}
          value={canton || undefined}
          onValueChange={onCantonChange}
          disabled={!provincia}
        >
          <SelectTrigger variant={variant} aria-invalid={Boolean(errorCanton)}>
            <SelectValue placeholder={placeholderCanton} />
          </SelectTrigger>
          <SelectContent>
            {cantones.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
            {canton && !cantonEnCatalogo && (
              <SelectItem value={canton}>{canton} (personalizado)</SelectItem>
            )}
          </SelectContent>
        </Select>
      </LabeledField>
    </div>
  );
}
