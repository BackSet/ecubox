import { useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useCreateLoteRecepcion } from '@/hooks/useLotesRecepcion';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

function defaultFechaRecepcion(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function LoteRecepcionNuevoPage() {
  const navigate = useNavigate();
  const createMutation = useCreateLoteRecepcion();
  const [fechaRecepcion, setFechaRecepcion] = useState(defaultFechaRecepcion);
  const [observaciones, setObservaciones] = useState('');
  const [guiasText, setGuiasText] = useState('');

  const handleRegistrar = () => {
    const numeroGuiasEnvio = guiasText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (numeroGuiasEnvio.length === 0) {
      toast.error('Ingrese al menos una guía de envío (una por línea).');
      return;
    }
    const fecha = fechaRecepcion ? new Date(fechaRecepcion).toISOString() : undefined;
    createMutation.mutate(
      {
        fechaRecepcion: fecha,
        observaciones: observaciones.trim() || undefined,
        numeroGuiasEnvio,
      },
      {
        onSuccess: (data) => {
          const count = data.numeroGuiasEnvio?.length ?? 0;
          const omitidas = numeroGuiasEnvio.length - count;
          if (omitidas > 0) {
            toast.success(`Lote registrado con ${count} guía(s). ${omitidas} guía(s) no tenían paquetes y no se incluyeron.`);
          } else {
            toast.success(`Lote registrado con ${count} guía(s).`);
          }
          navigate({ to: '/lotes-recepcion/$id', params: { id: String(data.id) } });
        },
        onError: () => {
          toast.error('No se pudo registrar el lote.');
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/lotes-recepcion">
          <Button variant="ghost" size="icon" aria-label="Volver a lotes de recepción">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
          Registrar nuevo lote de recepción
        </h1>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <h2 className="mb-4 text-base font-semibold text-[var(--color-foreground)]">
          Datos del lote
        </h2>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="fecha-recepcion" className="text-sm font-medium text-[var(--color-foreground)]">
              Fecha de recepción
            </label>
            <input
              id="fecha-recepcion"
              type="datetime-local"
              value={fechaRecepcion}
              onChange={(e) => setFechaRecepcion(e.target.value)}
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-1" />
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="observaciones" className="text-sm font-medium text-[var(--color-foreground)]">
              Observaciones (opcional)
            </label>
            <textarea
              id="observaciones"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={2}
              placeholder="Observaciones del lote..."
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label htmlFor="guias" className="text-sm font-medium text-[var(--color-foreground)]">
              Guías de envío (una por línea)
            </label>
            <textarea
              id="guias"
              value={guiasText}
              onChange={(e) => setGuiasText(e.target.value)}
              rows={6}
              placeholder="Número de guía 1&#10;Número de guía 2&#10;..."
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 font-mono text-sm"
            />
            <p className="text-xs text-[var(--color-muted-foreground)]">
              Solo se incluirán las guías que tengan paquetes registrados en el sistema.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            onClick={handleRegistrar}
            disabled={createMutation.isPending || !guiasText.trim()}
          >
            {createMutation.isPending ? 'Registrando...' : 'Registrar lote'}
          </Button>
          <Link to="/lotes-recepcion">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
