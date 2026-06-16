import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  CalendarClock,
  Copy,
  Loader2,
  Megaphone,
  Moon,
  Pencil,
  Plus,
  Send,
  Sun,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, type StatusTone } from '@/components/ui/StatusBadge';
import { SurfaceCard } from '@/components/ui/surface-card';
import { LabeledField } from '@/components/LabeledField';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useAuthStore } from '@/stores/authStore';
import {
  useActualizarCampania,
  useCampaniasLanding,
  useCrearCampania,
  useDesactivarCampania,
  useEliminarCampania,
  usePublicarCampania,
} from '@/hooks/useCampaniasLanding';
import { campaniaLandingSchema, type CampaniaLandingFormValues } from '@/lib/schemas/campania-landing';
import { FeaturedCampaignSection } from '@/components/public/FeaturedCampaignSection';
import { getApiErrorMessage } from '@/lib/api/error-message';
import type {
  CampaniaLanding,
  CampaniaLandingPublic,
  CampaniaLandingRequest,
  EstadoCampaniaLanding,
  TipoCampaniaLanding,
  VigenciaCampaniaLanding,
} from '@/types/campania-landing';

const TIPO_LABEL: Record<TipoCampaniaLanding, string> = {
  OFERTA: 'Oferta',
  INFORMACION: 'Información',
  NOVEDAD: 'Novedad',
  AVISO: 'Aviso',
};
const ESTADO_TONE: Record<EstadoCampaniaLanding, StatusTone> = {
  BORRADOR: 'neutral',
  PUBLICADA: 'success',
  INACTIVA: 'warning',
};
const ESTADO_LABEL: Record<EstadoCampaniaLanding, string> = {
  BORRADOR: 'Borrador',
  PUBLICADA: 'Publicada',
  INACTIVA: 'Inactiva',
};
const VIGENCIA_TONE: Record<VigenciaCampaniaLanding, StatusTone> = {
  PROGRAMADA: 'info',
  VIGENTE: 'success',
  VENCIDA: 'warning',
};
const VIGENCIA_LABEL: Record<VigenciaCampaniaLanding, string> = {
  PROGRAMADA: 'Programada',
  VIGENTE: 'Vigente',
  VENCIDA: 'Vencida',
};

function toInputDate(iso?: string | null): string {
  if (!iso) return '';
  return iso.length >= 16 ? iso.slice(0, 16) : iso;
}

function emptyToNull(s?: string | null): string | null {
  const t = (s ?? '').trim();
  return t.length === 0 ? null : t;
}

function formToRequest(v: CampaniaLandingFormValues, version?: number | null): CampaniaLandingRequest {
  return {
    nombreInterno: v.nombreInterno.trim(),
    tipo: v.tipo,
    etiqueta: emptyToNull(v.etiqueta),
    titulo: emptyToNull(v.titulo),
    descripcion: emptyToNull(v.descripcion),
    textoCta: emptyToNull(v.textoCta),
    urlCta: emptyToNull(v.urlCta),
    tipoDestinoCta: v.tipoDestinoCta ?? null,
    imagenUrl: emptyToNull(v.imagenUrl),
    textoAlternativoImagen: emptyToNull(v.textoAlternativoImagen),
    fechaInicio: emptyToNull(v.fechaInicio),
    fechaFin: emptyToNull(v.fechaFin),
    version: version ?? null,
  };
}

function formToPreview(v: CampaniaLandingFormValues): CampaniaLandingPublic {
  return {
    tipo: v.tipo,
    etiqueta: emptyToNull(v.etiqueta),
    titulo: emptyToNull(v.titulo),
    descripcion: emptyToNull(v.descripcion),
    textoCta: emptyToNull(v.textoCta),
    urlCta: emptyToNull(v.urlCta),
    tipoDestinoCta: v.tipoDestinoCta ?? null,
    imagenUrl: emptyToNull(v.imagenUrl),
    textoAlternativoImagen: emptyToNull(v.textoAlternativoImagen),
  };
}

/**
 * Sección «Contenido destacado» de Parámetros del sistema: lista de campañas de
 * la landing y editor con vista previa real (mismo componente que la landing).
 */
export function ContenidoDestacadoPanel() {
  const canWrite = useAuthStore((s) => s.hasPermission('CONTENIDO_DESTACADO_LANDING_WRITE'));
  const canPublish = useAuthStore((s) => s.hasPermission('CONTENIDO_DESTACADO_LANDING_PUBLISH'));

  const { data: campanias = [], isLoading } = useCampaniasLanding();
  const [editing, setEditing] = useState<CampaniaLanding | 'nueva' | null>(null);
  const [confirmEliminar, setConfirmEliminar] = useState<CampaniaLanding | null>(null);
  const [confirmDesactivar, setConfirmDesactivar] = useState<CampaniaLanding | null>(null);

  const desactivar = useDesactivarCampania();
  const eliminar = useEliminarCampania();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Contenido destacado de la landing</h2>
          <p className="text-sm text-muted-foreground">
            Configura campañas para la página pública. Solo una puede estar publicada a la vez.
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setEditing('nueva')} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Nueva campaña
          </Button>
        )}
      </div>

      {isLoading ? (
        <SurfaceCard className="p-6 text-sm text-muted-foreground">Cargando campañas…</SurfaceCard>
      ) : campanias.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Aún no hay campañas"
          description="Crea una campaña para destacar una oferta o aviso en la landing."
          action={canWrite ? <Button onClick={() => setEditing('nueva')}>Nueva campaña</Button> : undefined}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {campanias.map((c) => (
            <CampaniaRow
              key={c.id}
              campania={c}
              canWrite={canWrite}
              canPublish={canPublish}
              onEdit={() => setEditing(c)}
              onDuplicate={() => setEditing({ ...c, id: 0 as number, estado: 'BORRADOR' })}
              onDeactivate={() => setConfirmDesactivar(c)}
              onDelete={() => setConfirmEliminar(c)}
            />
          ))}
        </div>
      )}

      {editing && (
        <CampaniaEditorDialog
          base={editing === 'nueva' ? null : editing}
          canPublish={canPublish}
          onClose={() => setEditing(null)}
        />
      )}

      <ConfirmDialog
        open={confirmDesactivar != null}
        onOpenChange={(o) => !o && setConfirmDesactivar(null)}
        title="¿Desactivar campaña?"
        description="Dejará de mostrarse en la landing. Podrás volver a publicarla más tarde."
        confirmLabel="Desactivar"
        loading={desactivar.isPending}
        onConfirm={async () => {
          if (!confirmDesactivar) return;
          try {
            await desactivar.mutateAsync(confirmDesactivar.id);
            toast.success('Campaña desactivada');
            setConfirmDesactivar(null);
          } catch (e) {
            toast.error(getApiErrorMessage(e) ?? 'No se pudo desactivar');
            throw e;
          }
        }}
      />

      <ConfirmDialog
        open={confirmEliminar != null}
        onOpenChange={(o) => !o && setConfirmEliminar(null)}
        title="¿Eliminar campaña?"
        description="Esta acción no se puede deshacer. Solo se pueden eliminar borradores o campañas inactivas."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={eliminar.isPending}
        onConfirm={async () => {
          if (!confirmEliminar) return;
          try {
            await eliminar.mutateAsync(confirmEliminar.id);
            toast.success('Campaña eliminada');
            setConfirmEliminar(null);
          } catch (e) {
            toast.error(getApiErrorMessage(e) ?? 'No se pudo eliminar');
            throw e;
          }
        }}
      />
    </div>
  );
}

function CampaniaRow({
  campania: c,
  canWrite,
  canPublish,
  onEdit,
  onDuplicate,
  onDeactivate,
  onDelete,
}: {
  campania: CampaniaLanding;
  canWrite: boolean;
  canPublish: boolean;
  onEdit: () => void;
  onDuplicate: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <SurfaceCard className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium text-foreground">{c.nombreInterno}</span>
          <Badge variant="outline" className="font-mono text-[11px]">{c.codigo}</Badge>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">{TIPO_LABEL[c.tipo]}</span>
          <StatusBadge tone={ESTADO_TONE[c.estado]}>{ESTADO_LABEL[c.estado]}</StatusBadge>
          {c.vigencia && (
            <StatusBadge tone={VIGENCIA_TONE[c.vigencia]}>{VIGENCIA_LABEL[c.vigencia]}</StatusBadge>
          )}
          {c.actualizadaAt && (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <CalendarClock className="h-3 w-3" />
              {new Date(c.actualizadaAt).toLocaleDateString()}
              {c.actualizadaPorNombre ? ` · ${c.actualizadaPorNombre}` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {canWrite && (
          <Button variant="ghost" size="sm" onClick={onEdit}>
            <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
          </Button>
        )}
        {canWrite && (
          <Button variant="ghost" size="sm" onClick={onDuplicate}>
            <Copy className="mr-1 h-3.5 w-3.5" /> Duplicar
          </Button>
        )}
        {canPublish && c.estado === 'PUBLICADA' && (
          <Button variant="ghost" size="sm" onClick={onDeactivate}>
            Desactivar
          </Button>
        )}
        {canWrite && c.estado !== 'PUBLICADA' && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
          </Button>
        )}
      </div>
    </SurfaceCard>
  );
}

function CampaniaEditorDialog({
  base,
  canPublish,
  onClose,
}: {
  base: CampaniaLanding | null;
  canPublish: boolean;
  onClose: () => void;
}) {
  const esEdicion = !!base && base.id > 0;
  const crear = useCrearCampania();
  const actualizar = useActualizarCampania();
  const publicar = usePublicarCampania();
  const [previewDark, setPreviewDark] = useState(false);

  const form = useForm<CampaniaLandingFormValues>({
    resolver: zodResolver(campaniaLandingSchema),
    mode: 'onTouched',
    defaultValues: {
      nombreInterno: base?.nombreInterno ?? '',
      tipo: base?.tipo ?? 'OFERTA',
      etiqueta: base?.etiqueta ?? '',
      titulo: base?.titulo ?? '',
      descripcion: base?.descripcion ?? '',
      textoCta: base?.textoCta ?? '',
      urlCta: base?.urlCta ?? '',
      tipoDestinoCta: base?.tipoDestinoCta ?? undefined,
      imagenUrl: base?.imagenUrl ?? '',
      textoAlternativoImagen: base?.textoAlternativoImagen ?? '',
      fechaInicio: toInputDate(base?.fechaInicio),
      fechaFin: toInputDate(base?.fechaFin),
    },
  });
  const { register, handleSubmit, watch, setValue, formState } = form;
  const errores = formState.errors;
  const valores = watch();
  const previewData = useMemo(() => formToPreview(valores), [valores]);

  const guardando = crear.isPending || actualizar.isPending || publicar.isPending;

  async function persistir(): Promise<number | null> {
    const values = form.getValues();
    const body = formToRequest(values, esEdicion ? base?.version : null);
    if (esEdicion && base) {
      const updated = await actualizar.mutateAsync({ id: base.id, body });
      return updated.id;
    }
    const created = await crear.mutateAsync(body);
    return created.id;
  }

  const onGuardarBorrador = handleSubmit(async () => {
    try {
      await persistir();
      toast.success('Borrador guardado');
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? 'No se pudo guardar');
    }
  });

  const onPublicar = handleSubmit(async (values) => {
    if (!emptyToNull(values.titulo)) {
      form.setError('titulo', { message: 'El título es obligatorio para publicar' });
      return;
    }
    try {
      const id = await persistir();
      if (id != null) {
        await publicar.mutateAsync(id);
        toast.success('Campaña publicada');
        onClose();
      }
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? 'No se pudo publicar');
    }
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !guardando && onClose()}>
      <DialogContent className="max-h-[92vh] gap-0 overflow-y-auto p-0 sm:max-w-[920px]">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle>{esEdicion ? 'Editar campaña' : 'Nueva campaña'}</DialogTitle>
          <DialogDescription>
            Texto simple, sin HTML. La imagen y el CTA son opcionales.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-0 lg:grid-cols-2">
          {/* Formulario */}
          <form className="space-y-4 p-5" onSubmit={(e) => e.preventDefault()}>
            <LabeledField label="Nombre interno" required error={errores.nombreInterno?.message} hint="Solo para administración.">
              <Input {...register('nombreInterno')} placeholder="Ej: Promo Día de la Madre" />
            </LabeledField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LabeledField label="Tipo" required error={errores.tipo?.message}>
                <Select value={valores.tipo} onValueChange={(v) => setValue('tipo', v as TipoCampaniaLanding, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_LABEL) as TipoCampaniaLanding[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
              <LabeledField label="Etiqueta" error={errores.etiqueta?.message} hint="Texto corto sobre el título.">
                <Input {...register('etiqueta')} placeholder="Ej: Nuevo" />
              </LabeledField>
            </div>

            <LabeledField label="Título" error={errores.titulo?.message} hint="Obligatorio al publicar.">
              <Input {...register('titulo')} placeholder="Ej: 20% de descuento en envíos" />
            </LabeledField>

            <LabeledField label="Descripción" error={errores.descripcion?.message}>
              <Textarea {...register('descripcion')} rows={3} className="resize-none" maxLength={500} />
            </LabeledField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LabeledField label="Texto del CTA" error={errores.textoCta?.message}>
                <Input {...register('textoCta')} placeholder="Ej: Aprovéchalo" />
              </LabeledField>
              <LabeledField label="Tipo de destino" error={errores.tipoDestinoCta?.message}>
                <Select
                  value={valores.tipoDestinoCta ?? ''}
                  onValueChange={(v) => setValue('tipoDestinoCta', (v || undefined) as 'INTERNO' | 'EXTERNO' | undefined, { shouldDirty: true })}
                >
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNO">Interno (ruta del sitio)</SelectItem>
                    <SelectItem value="EXTERNO">Externo (HTTPS)</SelectItem>
                  </SelectContent>
                </Select>
              </LabeledField>
            </div>
            <LabeledField label="URL del CTA" error={errores.urlCta?.message} hint="Interna empieza con «/»; externa debe ser HTTPS.">
              <Input {...register('urlCta')} placeholder="/registro  ó  https://…" />
            </LabeledField>

            <LabeledField label="Imagen (URL HTTPS)" error={errores.imagenUrl?.message}>
              <Input {...register('imagenUrl')} placeholder="https://…" />
            </LabeledField>
            <LabeledField label="Texto alternativo de la imagen" error={errores.textoAlternativoImagen?.message} hint="Obligatorio si hay imagen.">
              <Input {...register('textoAlternativoImagen')} placeholder="Describe la imagen" />
            </LabeledField>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <LabeledField label="Inicio (opcional)" error={errores.fechaInicio?.message}>
                <Input type="datetime-local" {...register('fechaInicio')} />
              </LabeledField>
              <LabeledField label="Fin (opcional)" error={errores.fechaFin?.message}>
                <Input type="datetime-local" {...register('fechaFin')} />
              </LabeledField>
            </div>
          </form>

          {/* Vista previa real */}
          <div className="border-t border-border bg-muted/20 p-5 lg:border-l lg:border-t-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vista previa</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreviewDark((d) => !d)}
                aria-label={previewDark ? 'Ver en modo claro' : 'Ver en modo oscuro'}
              >
                {previewDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                <span className="ml-1.5">{previewDark ? 'Claro' : 'Oscuro'}</span>
              </Button>
            </div>
            <div
              data-testid="campania-preview"
              className={`${previewDark ? 'dark' : ''} overflow-hidden rounded-lg border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)]`}
            >
              {emptyToNull(valores.titulo) ? (
                <FeaturedCampaignSection campania={previewData} />
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Escribe un título para ver la vista previa.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border p-5 sm:gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={guardando}>
            Cancelar
          </Button>
          <Button type="button" variant="outline" onClick={onGuardarBorrador} disabled={guardando}>
            {guardando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar borrador
          </Button>
          {canPublish && (
            <Button type="button" onClick={onPublicar} disabled={guardando}>
              {guardando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Publicar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
