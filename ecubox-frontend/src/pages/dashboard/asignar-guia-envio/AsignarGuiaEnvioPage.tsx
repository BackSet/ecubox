import { useState, useCallback, useMemo } from 'react';
import { buscarPaquetesPorGuias } from '@/lib/api/paquetes.service';
import { useAsignarGuiaEnvioBulk } from '@/hooks/usePaquetesOperario';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Paquete } from '@/types/paquete';
import { AlertTriangle } from 'lucide-react';

function parseGuiasFromTextarea(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function dedupe(list: string[]): string[] {
  return [...new Set(list)];
}

function hasGuiaEnvio(p: Paquete): boolean {
  const g = p.numeroGuiaEnvio;
  return g != null && g.trim() !== '';
}

export function AsignarGuiaEnvioPage() {
  const [numeroGuiaEnvio, setNumeroGuiaEnvio] = useState('');
  const [guiasEcuboxText, setGuiasEcuboxText] = useState('');
  const [paquetesEncontrados, setPaquetesEncontrados] = useState<Paquete[] | null>(null);
  const [guiasNoEncontradas, setGuiasNoEncontradas] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  /** IDs de paquetes que recibirán la nueva guía (por defecto todos; si tienen guía actual se puede desmarcar "Asignar a la nueva") */
  const [reasignarIds, setReasignarIds] = useState<Set<number>>(new Set());

  const asignarBulk = useAsignarGuiaEnvioBulk();

  const conGuiaActual = useMemo(() => {
    const list = paquetesEncontrados ?? [];
    const con: Paquete[] = [];
    list.forEach((p) => {
      if (hasGuiaEnvio(p)) con.push(p);
    });
    return con;
  }, [paquetesEncontrados]);

  const handleBuscar = useCallback(async () => {
    const guias = dedupe(parseGuiasFromTextarea(guiasEcuboxText));
    if (guias.length === 0) {
      toast.error('Escribe al menos una guía ECUBOX (una por línea).');
      return;
    }
    setBuscando(true);
    setPaquetesEncontrados(null);
    setGuiasNoEncontradas([]);
    setReasignarIds(new Set());
    try {
      const encontrados = await buscarPaquetesPorGuias(guias);
      const encontradasSet = new Set(encontrados.map((p) => p.numeroGuia));
      const noEncontradas = guias.filter((g) => !encontradasSet.has(g));
      setPaquetesEncontrados(encontrados);
      setGuiasNoEncontradas(noEncontradas);
      setReasignarIds(new Set(encontrados.map((p) => p.id)));
      if (encontrados.length === 0) {
        toast.info('No se encontraron paquetes con esas guías.');
      }
    } catch {
      toast.error('Error al buscar paquetes.');
    } finally {
      setBuscando(false);
    }
  }, [guiasEcuboxText]);

  const toggleReasignar = useCallback((paqueteId: number, assignNew: boolean) => {
    setReasignarIds((prev) => {
      const next = new Set(prev);
      if (assignNew) next.add(paqueteId);
      else next.delete(paqueteId);
      return next;
    });
  }, []);

  const handleAsignar = useCallback(async () => {
    const guiaEnvio = numeroGuiaEnvio.trim() || null;
    const paquetes = paquetesEncontrados ?? [];
    if (paquetes.length === 0) {
      toast.error('Primero busca paquetes con "Buscar paquetes".');
      return;
    }
    const idsToAssign = Array.from(reasignarIds).filter((id) =>
      paquetes.some((p) => p.id === id)
    );
    if (idsToAssign.length === 0) {
      toast.error('Selecciona al menos un paquete para asignar la nueva guía.');
      return;
    }
    try {
      await asignarBulk.mutateAsync({
        numeroGuiaEnvio: guiaEnvio,
        paqueteIds: idsToAssign,
      });
      toast.success(`Guía de envío asignada a ${idsToAssign.length} paquete(s).`);
      setPaquetesEncontrados(null);
      setGuiasNoEncontradas([]);
      setReasignarIds(new Set());
    } catch {
      toast.error('Error al asignar la guía de envío.');
    }
  }, [numeroGuiaEnvio, paquetesEncontrados, reasignarIds, asignarBulk]);

  const totalEncontrados = paquetesEncontrados?.length ?? 0;
  const totalAAsignar = Array.from(reasignarIds).filter((id) =>
    paquetesEncontrados?.some((p) => p.id === id)
  ).length;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--color-foreground)]">
          Asignar guía de envío
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Indica la guía del consolidador y la lista de guías ECUBOX; luego busca y asigna en bloque.
        </p>
      </div>

      <div className="surface-card space-y-4 p-4">
        <div>
          <Label className="mb-1 block">
            Guía de envío (consolidador)
          </Label>
          <Input
            type="text"
            value={numeroGuiaEnvio}
            onChange={(e) => setNumeroGuiaEnvio(e.target.value)}
            className="max-w-md"
            placeholder="Número de guía del consolidador"
          />
        </div>

        <div>
          <Label className="mb-1 block">
            Guías ECUBOX
          </Label>
          <Textarea
            value={guiasEcuboxText}
            onChange={(e) => setGuiasEcuboxText(e.target.value)}
            rows={6}
            className="max-w-md font-mono"
            placeholder="Una guía por línea"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={handleBuscar}
            disabled={buscando}
          >
            {buscando ? 'Buscando...' : 'Buscar paquetes'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAsignar}
            disabled={totalAAsignar === 0 || asignarBulk.isPending}
          >
            {asignarBulk.isPending ? 'Asignando...' : `Asignar guía a ${totalAAsignar} paquete(s)`}
          </Button>
        </div>
      </div>

      {conGuiaActual.length > 0 && (
        <div className="surface-card border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          <p className="text-sm text-[var(--color-foreground)]">
            {conGuiaActual.length} paquete(s) ya tienen guía de envío asignada. Puedes reasignarlos
            a la nueva guía o mantener la actual.
          </p>
        </div>
      )}

      {totalEncontrados > 0 && (
        <div className="surface-card overflow-hidden p-0">
          <p className="p-4 text-sm font-medium text-[var(--color-foreground)] border-b border-[var(--color-border)]">
            {totalEncontrados} paquete(s) encontrado(s). Se asignará la nueva guía a {totalAAsignar} paquete(s).
          </p>
          <div className="overflow-x-auto">
            <table className="compact-table">
              <thead>
                <tr>
                  <th>Guía ECUBOX</th>
                  <th>Destinatario</th>
                  <th>Guía de envío actual</th>
                  <th>Despacho</th>
                  {conGuiaActual.length > 0 && (
                    <th>Asignar a la nueva guía</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {(paquetesEncontrados ?? []).map((p) => {
                  const tieneGuia = hasGuiaEnvio(p);
                  const asignarNueva = reasignarIds.has(p.id);
                  return (
                    <tr key={p.id}>
                      <td className="font-mono">{p.numeroGuia}</td>
                      <td className="text-[var(--color-muted-foreground)]">
                        {p.destinatarioNombre ?? '—'}
                      </td>
                      <td>
                        {tieneGuia ? (
                          <span className="font-mono">{p.numeroGuiaEnvio}</span>
                        ) : (
                          <span className="text-[var(--color-muted-foreground)]">—</span>
                        )}
                      </td>
                      <td>
                        {p.despachoNumeroGuia ? (
                          <span className="text-[var(--color-muted-foreground)]">
                            Despacho: {p.despachoNumeroGuia}
                          </span>
                        ) : (
                          <span className="text-[var(--color-muted-foreground)]">—</span>
                        )}
                      </td>
                      {conGuiaActual.length > 0 && (
                        <td>
                          {tieneGuia ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <Checkbox
                                checked={asignarNueva}
                                onCheckedChange={(checked) => toggleReasignar(p.id, Boolean(checked))}
                              />
                              <span className="text-xs">
                                {asignarNueva ? 'Sí, reasignar' : 'Mantener actual'}
                              </span>
                            </label>
                          ) : (
                            <span className="text-xs text-[var(--color-muted-foreground)]">
                              Se asignará
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {guiasNoEncontradas.length > 0 && (
        <div className="surface-card p-4">
          <p className="text-sm font-medium text-[var(--color-destructive)]">
            No encontradas: {guiasNoEncontradas.join(', ')}
          </p>
        </div>
      )}
    </div>
  );
}
