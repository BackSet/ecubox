import { CheckCircle2, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export interface ResultadoBulkRechazo {
  codigo: string;
  motivo: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Acción/estado que se intentó aplicar, p. ej. "Cancelar guía". */
  accionLabel: string;
  unidadSingular: string;
  unidadPlural: string;
  procesadas: number;
  rechazados: ResultadoBulkRechazo[];
}

/**
 * Resumen del resultado de una acción masiva con rechazos: conteos de
 * procesadas/omitidas y la tabla de rechazados con el motivo que devolvió
 * el backend para cada una. Convención: las páginas solo lo abren cuando
 * hay rechazados; si todo salió bien basta el toast de notify.
 */
export function ResultadoBulkDialog({
  open,
  onOpenChange,
  accionLabel,
  unidadSingular,
  unidadPlural,
  procesadas,
  rechazados,
}: Props) {
  const unidad = (n: number) => (n === 1 ? unidadSingular : unidadPlural);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {procesadas === 0
              ? 'No se aplicó a ningún elemento'
              : 'Acción aplicada parcialmente'}
          </DialogTitle>
          <DialogDescription>
            Resultado de aplicar «{accionLabel}».
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-2 rounded-md border border-success/30 bg-success/10 p-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Aplicada a {procesadas} {unidad(procesadas)}
            </div>
            <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-sm text-warning">
              <TriangleAlert className="h-4 w-4 shrink-0" />
              Sin aplicar en {rechazados.length} {unidad(rechazados.length)}
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Código</th>
                  <th className="px-3 py-2 font-medium">Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rechazados.map((r, idx) => (
                  <tr key={`${r.codigo}-${idx}`} className="align-top">
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{r.codigo}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.motivo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={() => onOpenChange(false)}>Entendido</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
