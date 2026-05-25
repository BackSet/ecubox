import { useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import { BulkGuiaInputPanel, type BulkGuiaTab } from '@/components/BulkGuiaInputPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useAgregarPaquetesEnvioConsolidado,
  useCrearEnvioConsolidado,
  useEnviosConsolidados,
} from '@/hooks/useEnviosConsolidados';
import { buscarPaquetesPorGuias } from '@/lib/api/paquetes.service';
import { asignarEnvioSchema, validateGuiaList } from '@/lib/schemas';
import type { Paquete } from '@/types/paquete';
import { EnvioConsolidadoBadge } from '@/pages/dashboard/envios-consolidados/EnvioConsolidadoBadge';

const NUEVO_ENVIO_VALUE = '__nuevo__';

interface AsignarAEnvioConsolidadoDialogProps {
  open: boolean;
  onClose: () => void;
  /** Paquetes pre-seleccionados (opcional). Si se pasan, se omite la búsqueda por guías. */
  paquetesPreseleccionados?: Paquete[];
}

/**
 * Diálogo único para asignar paquetes a un envío consolidado.
 * Combina (en una sola vista):
 *   1. Selección/creación del envío consolidado (con código).
 *   2. Búsqueda de paquetes pegando números de guía (uno por línea), si no hay
 *      paquetes preseleccionados.
 *   3. Asignación masiva al envío.
 *
 * El backend asocia el paquete al envío consolidado vía la FK
 * `paquete.envio_consolidado_id`; el código del envío queda accesible
 * en `paquete.envioConsolidadoCodigo`.
 */
export function AsignarAEnvioConsolidadoDialog({
  open,
  onClose,
  paquetesPreseleccionados,
}: AsignarAEnvioConsolidadoDialogProps) {
  const navigate = useNavigate();
  const [envioSeleccion, setEnvioSeleccion] = useState<string>('');
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [text, setText] = useState('');
  const [guiaTab, setGuiaTab] = useState<BulkGuiaTab>('lista');
  const [guiaIndividual, setGuiaIndividual] = useState('');
  const [paquetes, setPaquetes] = useState<Paquete[]>(paquetesPreseleccionados ?? []);
  const [noEncontradas, setNoEncontradas] = useState<string[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [guiaListError, setGuiaListError] = useState<string | undefined>();
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: enviosData, isLoading: loadingEnvios } = useEnviosConsolidados({
    estado: 'ABIERTO',
    page: 0,
    size: 100,
  });
  const enviosAbiertos = enviosData?.content ?? [];

  const crear = useCrearEnvioConsolidado();
  const agregar = useAgregarPaquetesEnvioConsolidado();

  const guias = useMemo(
    () =>
      Array.from(
        new Set(
          text
            .split(/\r?\n/)
            .map((s) => s.trim())
            .filter(Boolean),
        ),
      ),
    [text],
  );

  const usarPreseleccion = (paquetesPreseleccionados?.length ?? 0) > 0;
  const procesando = crear.isPending || agregar.isPending;

  function reset() {
    setEnvioSeleccion('');
    setNuevoCodigo('');
    setText('');
    setGuiaTab('lista');
    setGuiaIndividual('');
    setPaquetes(paquetesPreseleccionados ?? []);
    setNoEncontradas([]);
    setGuiaListError(undefined);
    setFieldErrors({});
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function buscarGuias(guiasABuscar: string[]) {
    if (guiasABuscar.length === 0) {
      toast.error('Pega al menos un número de guía');
      return;
    }
    setBuscando(true);
    try {
      const encontrados = await buscarPaquetesPorGuias(guiasABuscar);
      setPaquetes((prev) => {
        const map = new Map(prev.map((p) => [p.id, p]));
        for (const p of encontrados) map.set(p.id, p);
        return Array.from(map.values());
      });
      const set = new Set(encontrados.map((p) => p.numeroGuia));
      const faltantes = guiasABuscar.filter((g) => !set.has(g));
      setNoEncontradas((prev) =>
        Array.from(new Set([...prev, ...faltantes])),
      );
      if (encontrados.length === 0) {
        toast.info('No se encontraron paquetes con esas guías');
      }
    } catch {
      toast.error('Error al buscar paquetes');
    } finally {
      setBuscando(false);
    }
  }

  async function handleBuscar() {
    const listCheck = validateGuiaList(text);
    if (!listCheck.ok) {
      setGuiaListError(listCheck.errors.join(' · '));
      return;
    }
    setGuiaListError(undefined);
    await buscarGuias(listCheck.guias);
  }

  async function handleAgregarIndividual() {
    const g = guiaIndividual.trim();
    if (!g) return;
    const check = validateGuiaList(g);
    if (!check.ok) {
      setGuiaListError(check.errors.join(' · '));
      return;
    }
    setGuiaListError(undefined);
    await buscarGuias(check.guias);
    setGuiaIndividual('');
  }

  async function handleAsignar() {
    const modo = envioSeleccion === NUEVO_ENVIO_VALUE ? 'nuevo' : 'existente';
    const parsed = asignarEnvioSchema.safeParse({
      modo,
      envioConsolidadoId:
        modo === 'existente' && envioSeleccion ? Number(envioSeleccion) : undefined,
      nuevoCodigo: modo === 'nuevo' ? nuevoCodigo : undefined,
      numerosGuia: paquetes.map((p) => p.numeroGuia),
    });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '_form');
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      const formMsg = errs._form ?? Object.values(errs)[0];
      if (formMsg) toast.error(formMsg);
      return;
    }
    setFieldErrors({});

    try {
      let envioId: number;
      let codigoFinal: string;
      let asociadosTotal = paquetes.length;

      if (envioSeleccion === NUEVO_ENVIO_VALUE) {
        const codigo = parsed.data.nuevoCodigo!.trim();
        // Endpoint atomico: crea el envio y asocia las guias en una sola
        // transaccion. Evita la segunda llamada a "agregar paquetes".
        const nuevo = await crear.mutateAsync({
          codigo,
          numerosGuia: paquetes.map((p) => p.numeroGuia),
        });
        envioId = nuevo.envio.id;
        codigoFinal = nuevo.envio.codigo;
        asociadosTotal = nuevo.envio.totalPaquetes ?? paquetes.length;
        if (nuevo.guiasNoEncontradas.length > 0) {
          toast.warning(
            `No se encontraron en el sistema: ${nuevo.guiasNoEncontradas.join(', ')}`,
          );
        }
      } else {
        envioId = Number(envioSeleccion);
        codigoFinal = enviosAbiertos.find((e) => e.id === envioId)?.codigo ?? '';
        await agregar.mutateAsync({
          id: envioId,
          body: { paqueteIds: paquetes.map((p) => p.id) },
        });
      }

      toast.success(
        `${asociadosTotal} paquete(s) asignados al envío ${codigoFinal}`,
        {
          action: {
            label: 'Ir al envío',
            onClick: () =>
              navigate({
                to: '/envios-consolidados/$id',
                params: { id: String(envioId) },
              }),
          },
        },
      );
      handleClose();
    } catch (err: unknown) {
      const res = (err as { response?: { status?: number; data?: { message?: string } } })
        ?.response;
      if (res?.status === 409) {
        toast.error('Ya existe un envío con ese código. Selecciónalo de la lista.');
      } else {
        toast.error(res?.data?.message ?? 'No se pudo asignar al envío consolidado');
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Asignar a envío consolidado</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Asocia paquetes al envío consolidado (USA → Ecuador). Puedes elegir un envío
            abierto o crear uno nuevo. El número de guía de envío se sincroniza
            automáticamente en cada paquete.
          </p>

          <div className="space-y-2">
            <Label>Envío consolidado *</Label>
            <Select
              value={envioSeleccion}
              onValueChange={(v) => {
                setEnvioSeleccion(v);
                setFieldErrors((prev) => {
                  const next = { ...prev };
                  delete next.envioConsolidadoId;
                  delete next.nuevoCodigo;
                  return next;
                });
              }}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingEnvios
                      ? 'Cargando envíos abiertos...'
                      : 'Elige un envío abierto o crea uno nuevo'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NUEVO_ENVIO_VALUE}>
                  <span className="inline-flex items-center gap-2">
                    <Plus className="h-3.5 w-3.5" />
                    Crear nuevo envío
                  </span>
                </SelectItem>
                {enviosAbiertos.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>
                    <span className="inline-flex items-center gap-2">
                      <span className="font-mono">{e.codigo}</span>
                      <EnvioConsolidadoBadge cerrado={e.cerrado} />
                      <span className="text-xs text-muted-foreground">
                        ({e.totalPaquetes ?? 0} paquetes)
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.envioConsolidadoId && (
              <p className="text-xs text-destructive">{fieldErrors.envioConsolidadoId}</p>
            )}
            {envioSeleccion === NUEVO_ENVIO_VALUE && (
              <>
                <Input
                  value={nuevoCodigo}
                  onChange={(e) => {
                    setNuevoCodigo(e.target.value);
                    setFieldErrors((prev) => {
                      const next = { ...prev };
                      delete next.nuevoCodigo;
                      return next;
                    });
                  }}
                  placeholder="Código del nuevo envío (ej: 86157)"
                  autoFocus
                  aria-invalid={!!fieldErrors.nuevoCodigo}
                />
                {fieldErrors.nuevoCodigo && (
                  <p className="text-xs text-destructive">{fieldErrors.nuevoCodigo}</p>
                )}
              </>
            )}
            {fieldErrors.numerosGuia && (
              <p className="text-xs text-destructive">{fieldErrors.numerosGuia}</p>
            )}
          </div>

          {!usarPreseleccion && (
            <BulkGuiaInputPanel
              tab={guiaTab}
              onTabChange={setGuiaTab}
              listValue={text}
              onListChange={(v) => {
                setText(v);
                setGuiaListError(undefined);
              }}
              individualValue={guiaIndividual}
              onIndividualChange={setGuiaIndividual}
              onProcessList={handleBuscar}
              onProcessIndividual={handleAgregarIndividual}
              procesandoLista={buscando}
              procesandoIndividual={buscando}
              loading={procesando}
              listButtonLabel={`Buscar paquetes (${guias.length})`}
              listPlaceholder={'1Z52159R0379385035 1/3\n1Z52159R0379385035 2/3'}
              lineCount={guias.length}
              guiaCount={guias.length}
              validationError={guiaListError}
            />
          )}

          {paquetes.length > 0 && (
            <div className="rounded border border-border p-3">
              <p className="mb-2 text-sm font-medium">
                {paquetes.length} paquete(s)
                {usarPreseleccion ? ' seleccionados' : ' encontrados'}
              </p>
              <ul className="max-h-32 space-y-1 overflow-auto text-xs font-mono">
                {paquetes.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <span>{p.numeroGuia}</span>
                    {p.envioConsolidadoCodigo && (
                      <span className="text-[var(--color-warning)] dark:text-[var(--color-warning)]">
                        (ya estaba en {p.envioConsolidadoCodigo} → será reasignado)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {noEncontradas.length > 0 && (
            <div className="rounded border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 p-2 text-[var(--color-warning)]">
              <p className="mb-1 text-sm font-medium">No encontradas:</p>
              <ul className="text-xs font-mono">
                {noEncontradas.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleClose} disabled={procesando}>
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleAsignar}
            disabled={procesando || paquetes.length === 0 || !envioSeleccion}
          >
            {procesando
              ? 'Asignando...'
              : `Asignar ${paquetes.length} paquete(s) al envío`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
