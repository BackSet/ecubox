import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  CalendarClock,
  Copy,
  Loader2,
  Megaphone,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Send,
  Smartphone,
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
import { ImageUrlField } from '@/components/ImageUrlField';
import { EmptyState } from '@/components/EmptyState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { UnsavedChangesDialog } from '@/components/UnsavedChangesDialog';
import { useUnsavedChangesBlocker } from '@/hooks/useUnsavedChangesBlocker';
import { cn } from '@/lib/utils';
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
import {
  campaniaBorradorSchema,
  campaniaPublicacionSchema,
  requisitosPendientesPublicacion,
  type CampaniaLandingFormValues,
} from '@/lib/schemas/campania-landing';
import { FeaturedCampaignSection } from '@/components/public/FeaturedCampaignSection';
import { getApiErrorMessage } from '@/lib/api/error-message';
import {
  resolverImagenCampania,
  type CampaniaLanding,
  type CampaniaLandingPublic,
  type CampaniaLandingRequest,
  type EstadoCampaniaLanding,
  type TipoCampaniaLanding,
  type VigenciaCampaniaLanding,
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
    imagenUrlClaro: emptyToNull(v.imagenUrlClaro),
    imagenUrlOscuro: emptyToNull(v.imagenUrlOscuro),
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
    imagenUrlClaro: emptyToNull(v.imagenUrlClaro),
    imagenUrlOscuro: emptyToNull(v.imagenUrlOscuro),
    textoAlternativoImagen: emptyToNull(v.textoAlternativoImagen),
  };
}

/** Marca de obligatoriedad por campo (no depende solo de «*»). */
type ReqTipo = 'obligatorio' | 'opcional' | 'condicional' | 'publicar';
function Req({ tipo }: { tipo: ReqTipo }) {
  const map: Record<ReqTipo, { t: string; c: string }> = {
    obligatorio: { t: 'Obligatorio', c: 'text-[var(--color-destructive)]' },
    opcional: { t: 'Opcional', c: 'text-muted-foreground' },
    condicional: { t: 'Condicional', c: 'text-[var(--color-warning)]' },
    publicar: { t: 'Obligatorio para publicar', c: 'text-[var(--color-primary)]' },
  };
  const { t, c } = map[tipo];
  return <span className={cn('ml-1 text-[10px] font-normal uppercase tracking-wide', c)}>{t}</span>;
}

function GrupoEditor({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-md border border-border bg-card/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{titulo}</h3>
      {children}
    </section>
  );
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
  const [previewTema, setPreviewTema] = useState<'light' | 'dark'>('light');
  const [previewMovil, setPreviewMovil] = useState(false);

  const form = useForm<CampaniaLandingFormValues>({
    // El formulario es válido para BORRADOR; la publicación valida aparte.
    resolver: zodResolver(campaniaBorradorSchema),
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
      imagenUrlClaro: base?.imagenUrlClaro ?? '',
      imagenUrlOscuro: base?.imagenUrlOscuro ?? '',
      textoAlternativoImagen: base?.textoAlternativoImagen ?? '',
      fechaInicio: toInputDate(base?.fechaInicio),
      fechaFin: toInputDate(base?.fechaFin),
    },
  });
  const { register, watch, setValue, formState } = form;
  const errores = formState.errors;
  const valores = watch();
  const previewData = useMemo(() => formToPreview(valores), [valores]);
  const pendientes = useMemo(() => requisitosPendientesPublicacion(valores), [valores]);
  const fallback = resolverImagenCampania(previewData, previewTema);

  const guardando = crear.isPending || actualizar.isPending || publicar.isPending;
  const sucio = formState.isDirty;

  // Bloqueo de navegación SPA mientras el editor tiene cambios sin guardar
  // (el aviso nativo se gestiona dentro del hook, solo cuando hay cambios).
  const navBlocker = useUnsavedChangesBlocker(sucio);
  const [confirmarCierre, setConfirmarCierre] = useState(false);

  function intentarCerrar() {
    if (guardando) return;
    if (sucio) {
      setConfirmarCierre(true);
      return;
    }
    onClose();
  }

  async function persistir(): Promise<number | null> {
    const body = formToRequest(form.getValues(), esEdicion ? base?.version : null);
    if (esEdicion && base) return (await actualizar.mutateAsync({ id: base.id, body })).id;
    return (await crear.mutateAsync(body)).id;
  }

  async function onGuardarBorrador() {
    const valido = await form.trigger();
    if (!valido) return;
    try {
      await persistir();
      toast.success('Borrador guardado');
      onClose();
    } catch (e) {
      toast.error(getApiErrorMessage(e) ?? 'No se pudo guardar');
    }
  }

  async function onPublicar() {
    // Validación completa de publicación: marca errores por campo y bloquea si faltan requisitos.
    const res = campaniaPublicacionSchema.safeParse(form.getValues());
    if (!res.success) {
      for (const issue of res.error.issues) {
        const campo = issue.path[0];
        if (typeof campo === 'string') {
          form.setError(campo as keyof CampaniaLandingFormValues, { message: issue.message });
        }
      }
      toast.warning('Faltan requisitos para publicar. Revisa la lista «Para publicar».');
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
  }

  return (
    <Dialog open onOpenChange={(o) => !o && intentarCerrar()}>
      <DialogContent className="max-h-[94vh] gap-0 overflow-hidden p-0 sm:max-w-[1040px]">
        <DialogHeader className="border-b border-border p-5">
          <DialogTitle>{esEdicion ? 'Editar campaña' : 'Nueva campaña'}</DialogTitle>
          <DialogDescription>
            Texto simple, sin HTML. Guarda como borrador en cualquier momento; al publicar se validan los requisitos.
          </DialogDescription>
        </DialogHeader>

        {/* Escritorio: formulario | preview sticky. Tablet/móvil: apilado. */}
        <div className="grid max-h-[calc(94vh-9rem)] grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          {/* Formulario */}
          <form className="space-y-4 p-5" onSubmit={(e) => e.preventDefault()}>
            <RequisitosCard pendientes={pendientes} />

            <GrupoEditor titulo="1. Identificación interna">
              <LabeledField label={<>Nombre interno <Req tipo="obligatorio" /></>} error={errores.nombreInterno?.message} hint="Solo para administración; no se muestra al público.">
                <Input {...register('nombreInterno')} placeholder="Ej: Promo Día de la Madre" />
              </LabeledField>
              <LabeledField label={<>Tipo <Req tipo="obligatorio" /></>} error={errores.tipo?.message}>
                <Select value={valores.tipo} onValueChange={(v) => setValue('tipo', v as TipoCampaniaLanding, { shouldDirty: true })}>
                  <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(TIPO_LABEL) as TipoCampaniaLanding[]).map((t) => (
                      <SelectItem key={t} value={t}>{TIPO_LABEL[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </LabeledField>
            </GrupoEditor>

            <GrupoEditor titulo="2. Contenido visible">
              <LabeledField label={<>Etiqueta <Req tipo="opcional" /></>} error={errores.etiqueta?.message} hint="Texto corto sobre el título.">
                <Input {...register('etiqueta')} placeholder="Ej: Nuevo" />
              </LabeledField>
              <LabeledField label={<>Título <Req tipo="publicar" /></>} error={errores.titulo?.message}>
                <Input {...register('titulo')} placeholder="Ej: 20% de descuento en envíos" />
              </LabeledField>
              <LabeledField label={<>Descripción <Req tipo="opcional" /></>} error={errores.descripcion?.message}>
                <Textarea {...register('descripcion')} rows={3} className="resize-none" maxLength={500} />
              </LabeledField>
            </GrupoEditor>

            <GrupoEditor titulo="3. Botón de acción">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LabeledField label={<>Texto del botón <Req tipo="condicional" /></>} error={errores.textoCta?.message}>
                  <Input {...register('textoCta')} placeholder="Ej: Aprovéchalo" />
                </LabeledField>
                <LabeledField label={<>Tipo de destino <Req tipo="condicional" /></>} error={errores.tipoDestinoCta?.message}>
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
              <LabeledField label={<>URL del botón <Req tipo="condicional" /></>} error={errores.urlCta?.message} hint="Interna empieza con «/»; externa debe ser HTTPS.">
                <Input {...register('urlCta')} placeholder="/registro  ó  https://…" />
              </LabeledField>
            </GrupoEditor>

            <GrupoEditor titulo="4. Imágenes por tema">
              <p className="text-[11px] text-muted-foreground">
                Ambas opcionales (16:9, ideal 1600 × 900 px). Si solo defines una, se usa en ambos temas.
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ImageUrlField
                  id="imagen-claro"
                  label="Imagen · modo claro"
                  badge={<Req tipo="opcional" />}
                  value={valores.imagenUrlClaro ?? ''}
                  onChange={(v) => setValue('imagenUrlClaro', v, { shouldDirty: true, shouldValidate: true })}
                  alt={valores.textoAlternativoImagen}
                  error={errores.imagenUrlClaro?.message}
                  hint="URL HTTPS."
                />
                <ImageUrlField
                  id="imagen-oscuro"
                  label="Imagen · modo oscuro"
                  badge={<Req tipo="opcional" />}
                  value={valores.imagenUrlOscuro ?? ''}
                  onChange={(v) => setValue('imagenUrlOscuro', v, { shouldDirty: true, shouldValidate: true })}
                  alt={valores.textoAlternativoImagen}
                  error={errores.imagenUrlOscuro?.message}
                  hint="URL HTTPS."
                />
              </div>
              <LabeledField label={<>Texto alternativo <Req tipo="condicional" /></>} error={errores.textoAlternativoImagen?.message} hint="Único para ambas imágenes; obligatorio al publicar si hay imagen.">
                <Input {...register('textoAlternativoImagen')} placeholder="Describe la imagen" />
              </LabeledField>
            </GrupoEditor>

            <GrupoEditor titulo="5. Vigencia">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <LabeledField label={<>Inicio <Req tipo="opcional" /></>} error={errores.fechaInicio?.message}>
                  <Input type="datetime-local" {...register('fechaInicio')} />
                </LabeledField>
                <LabeledField label={<>Fin <Req tipo="opcional" /></>} error={errores.fechaFin?.message}>
                  <Input type="datetime-local" {...register('fechaFin')} />
                </LabeledField>
              </div>
            </GrupoEditor>

            <GrupoEditor titulo="6. Estado y publicación">
              <p className="text-xs text-muted-foreground">
                {esEdicion
                  ? `Estado actual: ${ESTADO_LABEL[base!.estado]}. `
                  : 'Se creará como borrador. '}
                Guarda un borrador o publica con los requisitos completos. Solo una campaña puede estar publicada a la vez.
              </p>
            </GrupoEditor>
          </form>

          {/* Vista previa real (sticky en escritorio, no en móvil). */}
          <div className="border-t border-border bg-muted/20 p-5 lg:sticky lg:top-0 lg:self-start lg:border-l lg:border-t-0">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vista previa</span>
              <div className="flex items-center gap-1.5">
                <SegBtn active={!previewMovil} onClick={() => setPreviewMovil(false)} icon={<Monitor className="h-3.5 w-3.5" />} label="Escritorio" />
                <SegBtn active={previewMovil} onClick={() => setPreviewMovil(true)} icon={<Smartphone className="h-3.5 w-3.5" />} label="Móvil" />
                <span className="mx-1 h-4 w-px bg-border" aria-hidden />
                <SegBtn active={previewTema === 'light'} onClick={() => setPreviewTema('light')} icon={<Sun className="h-3.5 w-3.5" />} label="Claro" />
                <SegBtn active={previewTema === 'dark'} onClick={() => setPreviewTema('dark')} icon={<Moon className="h-3.5 w-3.5" />} label="Oscuro" />
              </div>
            </div>

            {fallback.usandoFallback && (
              <p className="mb-2 rounded-md border border-[var(--color-warning)]/30 bg-[color-mix(in_oklab,var(--color-warning)_10%,transparent)] px-2.5 py-1.5 text-[11px] text-[var(--color-warning)]">
                Usando la imagen del otro tema como respaldo (no definiste una para {previewTema === 'dark' ? 'modo oscuro' : 'modo claro'}).
              </p>
            )}

            <div
              data-testid="campania-preview"
              className={cn(
                'mx-auto overflow-hidden rounded-lg border border-[var(--color-landing-border)] bg-[var(--color-landing-card-muted)]',
                previewTema === 'dark' && 'dark',
                previewMovil ? 'max-w-[360px]' : 'w-full',
              )}
            >
              {emptyToNull(valores.titulo) ? (
                <FeaturedCampaignSection campania={previewData} tema={previewTema} />
              ) : (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  Escribe un título para ver la vista previa.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t border-border p-5 sm:gap-2">
          <Button type="button" variant="secondary" onClick={intentarCerrar} disabled={guardando}>
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

      {/* Cierre del editor con cambios sin guardar (descarte estilizado). */}
      <ConfirmDialog
        open={confirmarCierre}
        onOpenChange={setConfirmarCierre}
        title="¿Descartar cambios?"
        description="Tienes cambios sin guardar en esta campaña. Si cierras ahora, se perderán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        variant="destructive"
        onConfirm={() => {
          setConfirmarCierre(false);
          onClose();
        }}
      />

      {/* Navegación SPA fuera de la página con el editor sucio. */}
      <UnsavedChangesDialog blocker={navBlocker} />
    </Dialog>
  );
}

function SegBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={cn(
        'ui-interactive inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]',
        active ? 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

/** Tarjeta «Para publicar»: requisitos fijos + pendientes derivados del schema. */
function RequisitosCard({ pendientes }: { pendientes: string[] }) {
  return (
    <SurfaceCard className="space-y-2 p-3 text-xs">
      <p className="font-semibold text-foreground">Para publicar</p>
      <p className="text-muted-foreground"><span className="font-medium text-foreground">Obligatorios:</span> Nombre interno, tipo y título.</p>
      <p className="text-muted-foreground"><span className="font-medium text-foreground">Condicionales:</span> Texto alternativo cuando hay imágenes. Texto y URL cuando hay botón.</p>
      <p className="text-muted-foreground"><span className="font-medium text-foreground">Opcionales:</span> Etiqueta, descripción, imágenes y fechas.</p>
      {pendientes.length > 0 ? (
        <div className="rounded-md border border-[var(--color-warning)]/30 bg-[color-mix(in_oklab,var(--color-warning)_8%,transparent)] p-2">
          <p className="font-medium text-[var(--color-warning)]">Pendientes ({pendientes.length}):</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[var(--color-warning)]">
            {pendientes.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="font-medium text-[var(--color-success)]">Lista para publicar.</p>
      )}
    </SurfaceCard>
  );
}
