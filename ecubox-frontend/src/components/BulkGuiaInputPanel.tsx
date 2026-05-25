import type { ReactNode } from 'react';
import { AlertCircle, Eraser, Layers, ScanBarcode } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { MAX_GUIAS_BULK } from '@/lib/schemas';
import { cn } from '@/lib/utils';

export type BulkGuiaTab = 'lista' | 'individual';

export interface BulkGuiaHistorialItem {
  guia: string;
  status: 'success' | 'error' | 'warning';
  message: string;
}

export interface BulkGuiaInputPanelProps {
  tab: BulkGuiaTab;
  onTabChange: (tab: BulkGuiaTab) => void;
  listValue: string;
  onListChange: (value: string) => void;
  individualValue: string;
  onIndividualChange: (value: string) => void;
  onProcessList: () => void | Promise<void>;
  onProcessIndividual: () => void | Promise<void>;
  procesandoLista?: boolean;
  procesandoIndividual?: boolean;
  loading?: boolean;
  listPlaceholder?: string;
  individualPlaceholder?: string;
  listLabel?: string;
  lineCount?: number;
  historial?: BulkGuiaHistorialItem[];
  resultado?: ReactNode;
  showTabs?: boolean;
  listButtonLabel?: string;
  className?: string;
  validationError?: string;
  guiaCount?: number;
  maxGuias?: number;
}

export function BulkGuiaInputPanel({
  tab,
  onTabChange,
  listValue,
  onListChange,
  individualValue,
  onIndividualChange,
  onProcessList,
  onProcessIndividual,
  procesandoLista = false,
  procesandoIndividual = false,
  loading = false,
  listPlaceholder = 'GU-12345\nGU-12346',
  individualPlaceholder = 'Escanea o escribe una guía',
  listLabel = 'Pega una guía por línea',
  lineCount,
  historial = [],
  resultado,
  showTabs = true,
  listButtonLabel = 'Procesar lista',
  className,
  validationError,
  guiaCount,
  maxGuias = MAX_GUIAS_BULK,
}: BulkGuiaInputPanelProps) {
  const lineas =
    lineCount ??
    listValue.split('\n').map((l) => l.trim()).filter(Boolean).length;
  const count = guiaCount ?? lineas;

  return (
    <div className={cn('flex flex-col space-y-3', className)}>
      {validationError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{validationError}</AlertDescription>
        </Alert>
      )}
      {showTabs && (
        <SegmentedControl
          value={tab}
          onValueChange={onTabChange}
          options={[
            { value: 'lista', label: <span className="inline-flex items-center gap-1"><Layers className="h-3.5 w-3.5" />Lista / Masivo</span> },
            { value: 'individual', label: <span className="inline-flex items-center gap-1"><ScanBarcode className="h-3.5 w-3.5" />Individual / Escáner</span> },
          ]}
          className="w-full max-w-md"
        />
      )}

      {tab === 'lista' && (
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">{listLabel}</label>
            <span
              className={cn(
                'text-xs tabular-nums',
                count > maxGuias
                  ? 'font-medium text-destructive'
                  : 'text-muted-foreground',
              )}
            >
              {count}/{maxGuias}
            </span>
          </div>
          <Textarea
            value={listValue}
            onChange={(e) => onListChange(e.target.value)}
            placeholder={listPlaceholder}
            className="min-h-[160px] resize-y font-mono text-sm"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              onClick={onProcessList}
              disabled={!listValue.trim() || procesandoLista || loading}
            >
              {procesandoLista ? 'Procesando...' : listButtonLabel}
            </Button>
            {listValue.trim() && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onListChange('')}
                disabled={procesandoLista || loading}
              >
                <Eraser className="mr-1 h-3.5 w-3.5" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      )}

      {tab === 'individual' && (
        <div className="flex flex-col space-y-3">
          <label className="text-xs font-medium text-muted-foreground">Guía individual</label>
          <div className="flex gap-2">
            <Input
              value={individualValue}
              onChange={(e) => onIndividualChange(e.target.value)}
              placeholder={individualPlaceholder}
              className="font-mono text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void onProcessIndividual();
                }
              }}
            />
            <Button
              type="button"
              onClick={onProcessIndividual}
              disabled={!individualValue.trim() || procesandoIndividual || loading}
            >
              {procesandoIndividual ? '...' : 'Agregar'}
            </Button>
          </div>
        </div>
      )}

      {resultado}

      {historial.length > 0 && (
        <div className="space-y-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Historial reciente
          </span>
          <ul className="max-h-28 space-y-0.5 overflow-auto text-xs">
            {historial.slice(0, 12).map((h, i) => (
              <li
                key={`${h.guia}-${i}`}
                className={cn(
                  'rounded px-2 py-0.5 font-mono',
                  h.status === 'success' && 'bg-[var(--color-success)]/10 text-[var(--color-success)]',
                  h.status === 'warning' && 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]',
                  h.status === 'error' && 'bg-[var(--color-destructive)]/10 text-[var(--color-destructive)]',
                )}
              >
                {h.guia} — {h.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
