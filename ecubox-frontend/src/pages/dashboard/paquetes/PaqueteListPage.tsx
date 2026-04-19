import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { usePaquetes, useDeletePaquete } from '@/hooks/usePaquetes';
import { useAuthStore } from '@/stores/authStore';
import { PaqueteForm } from './PaqueteForm';
import { PaqueteBulkCreateForm } from './PaqueteBulkCreateForm';
import { ListToolbar } from '@/components/ListToolbar';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { ListTableShell } from '@/components/ListTableShell';
import { KpiCard } from '@/components/KpiCard';
import { ChipFiltro } from '@/components/ChipFiltro';
import { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
import { MonoTrunc } from '@/components/MonoTrunc';
import { RowActionsMenu, type RowActionEntry } from '@/components/RowActionsMenu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ClipboardList,
  Layers,
  Package,
  Pencil,
  Plus,
  Trash2,
  Users,
  Weight,
} from 'lucide-react';
import type { Paquete } from '@/types/paquete';
import { getApiErrorMessage } from '@/lib/api/error-message';
import { GuiaMasterPiezaCell, DestinatarioCell } from './PaqueteCells';

export function PaqueteListPage() {
  const hasPaquetesCreate = useAuthStore((s) => s.hasPermission('PAQUETES_CREATE'));
  const hasPaquetesUpdate = useAuthStore((s) => s.hasPermission('PAQUETES_UPDATE'));
  const hasPaquetesDelete = useAuthStore((s) => s.hasPermission('PAQUETES_DELETE'));
  const hasPesoWrite = useAuthStore((s) => s.hasPermission('PAQUETES_PESO_WRITE'));
  const hasGuiasMasterUpdate = useAuthStore((s) =>
    s.hasPermission('GUIAS_MASTER_UPDATE'),
  );
  const { data: paquetes, isLoading, error } = usePaquetes();
  const deletePaquete = useDeletePaquete();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingPaquete, setEditingPaquete] = useState<Paquete | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  // Edición de las piezas asociadas a una guía master desde la fila de un
  // paquete. Reutiliza el formulario bulk en modo "edit" para precargar las
  // piezas existentes, permitir agregar/eliminar y guardar solo el diff.
  const [editandoPiezasGuiaId, setEditandoPiezasGuiaId] = useState<number | null>(
    null,
  );
  const [search, setSearch] = useState('');
  // Chip activo de estado de carga (segun datos persistidos en BD).
  const [chipActivo, setChipActivo] = useState<
    'todos' | 'sin_peso' | 'con_peso' | 'sin_guia_master' | 'vencidos'
  >('todos');
  // Filtros adicionales: estado de rastreo, destinatario y envio consolidado.
  const [estadoFiltro, setEstadoFiltro] = useState<string | undefined>(undefined);
  const [destinatarioFiltro, setDestinatarioFiltro] = useState<string | undefined>(
    undefined,
  );
  const [envioFiltro, setEnvioFiltro] = useState<string | undefined>(undefined);
  const [guiaMasterFiltro, setGuiaMasterFiltro] = useState<number | undefined>(
    undefined,
  );

  // Listas distintas presentes en los paquetes para poblar los comboboxes.
  const estadosDisponibles = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of paquetes ?? []) {
      const key = p.estadoRastreoCodigo ?? p.estadoRastreoNombre;
      if (!key) continue;
      const label = p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? key;
      if (!map.has(key)) map.set(key, label);
    }
    return Array.from(map.entries())
      .map(([codigo, nombre]) => ({ codigo, nombre }))
      .sort((a, b) =>
        a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
      );
  }, [paquetes]);

  const destinatarios = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetes ?? []) {
      const n = p.destinatarioNombre?.trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, 'es', { sensitivity: 'base' }),
    );
  }, [paquetes]);

  const codigosEnvio = useMemo(() => {
    const set = new Set<string>();
    for (const p of paquetes ?? []) {
      if (p.envioConsolidadoCodigo) set.add(p.envioConsolidadoCodigo);
    }
    return Array.from(set).sort();
  }, [paquetes]);

  const guiasMasterDisponibles = useMemo(() => {
    const map = new Map<number, string>();
    for (const p of paquetes ?? []) {
      if (p.guiaMasterId == null) continue;
      const label = p.guiaMasterTrackingBase ?? `#${p.guiaMasterId}`;
      if (!map.has(p.guiaMasterId)) map.set(p.guiaMasterId, label);
    }
    return Array.from(map.entries())
      .map(([id, trackingBase]) => ({ id, trackingBase }))
      .sort((a, b) =>
        a.trackingBase.localeCompare(b.trackingBase, 'es', { sensitivity: 'base' }),
      );
  }, [paquetes]);

  // baseList: todos los filtros excepto el chip de estado de carga, para que
  // los conteos de chips reflejen los demas filtros aplicados.
  const baseList = useMemo(() => {
    const raw = paquetes ?? [];
    const q = search.trim().toLowerCase();
    return raw.filter((p) => {
      if (estadoFiltro) {
        const key = p.estadoRastreoCodigo ?? p.estadoRastreoNombre ?? '';
        if (key !== estadoFiltro) return false;
      }
      if (
        destinatarioFiltro &&
        (p.destinatarioNombre ?? '') !== destinatarioFiltro
      ) {
        return false;
      }
      if (envioFiltro && (p.envioConsolidadoCodigo ?? '') !== envioFiltro) {
        return false;
      }
      if (guiaMasterFiltro != null && p.guiaMasterId !== guiaMasterFiltro) {
        return false;
      }
      if (!q) return true;
      return (
        p.numeroGuia?.toLowerCase().includes(q) ||
        (hasPesoWrite &&
          (p.guiaMasterTrackingBase?.toLowerCase().includes(q) ?? false)) ||
        (hasPesoWrite &&
          (p.envioConsolidadoCodigo?.toLowerCase().includes(q) ?? false)) ||
        (p.ref?.toLowerCase().includes(q) ?? false) ||
        (p.destinatarioNombre?.toLowerCase().includes(q) ?? false) ||
        (p.contenido?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [
    paquetes,
    search,
    hasPesoWrite,
    estadoFiltro,
    destinatarioFiltro,
    envioFiltro,
    guiaMasterFiltro,
  ]);

  const chipCounts = useMemo(() => {
    let sinPeso = 0;
    let conPeso = 0;
    let sinGuiaMaster = 0;
    let vencidos = 0;
    for (const p of baseList) {
      const tienePeso = p.pesoLbs != null || p.pesoKg != null;
      if (tienePeso) conPeso += 1;
      else sinPeso += 1;
      if (p.guiaMasterId == null) sinGuiaMaster += 1;
      if (p.paqueteVencido) vencidos += 1;
    }
    return { todos: baseList.length, sinPeso, conPeso, sinGuiaMaster, vencidos };
  }, [baseList]);

  const list = useMemo(() => {
    if (chipActivo === 'todos') return baseList;
    return baseList.filter((p) => {
      if (chipActivo === 'sin_peso') return p.pesoLbs == null && p.pesoKg == null;
      if (chipActivo === 'con_peso') return p.pesoLbs != null || p.pesoKg != null;
      if (chipActivo === 'sin_guia_master') return p.guiaMasterId == null;
      if (chipActivo === 'vencidos') return !!p.paqueteVencido;
      return true;
    });
  }, [baseList, chipActivo]);

  // KPIs sobre el universo total (no afectados por filtros para ser referencia).
  const stats = useMemo(() => {
    const all = paquetes ?? [];
    let conPeso = 0;
    let vencidos = 0;
    const destinatariosSet = new Set<number>();
    for (const p of all) {
      if (p.pesoLbs != null || p.pesoKg != null) conPeso += 1;
      if (p.paqueteVencido) vencidos += 1;
      if (p.destinatarioFinalId != null) destinatariosSet.add(p.destinatarioFinalId);
    }
    return {
      total: all.length,
      conPeso,
      vencidos,
      destinatarios: destinatariosSet.size,
    };
  }, [paquetes]);

  const tieneFiltros =
    !!estadoFiltro ||
    !!destinatarioFiltro ||
    !!envioFiltro ||
    guiaMasterFiltro != null ||
    chipActivo !== 'todos';

  const limpiarFiltros = useCallback(() => {
    setEstadoFiltro(undefined);
    setDestinatarioFiltro(undefined);
    setEnvioFiltro(undefined);
    setGuiaMasterFiltro(undefined);
    setChipActivo('todos');
  }, []);

  if (isLoading) {
    return <LoadingState text="Cargando paquetes..." />;
  }
  if (error) {
    return <div className="ui-alert ui-alert-error">Error al cargar paquetes.</div>;
  }

  const allPaquetes = paquetes ?? [];

  return (
    <div className="page-stack">
      <ListToolbar
        title="Gestión de paquetes"
        searchPlaceholder="Buscar por guía master, pieza, envío, destinatario o contenido..."
        onSearchChange={setSearch}
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            {hasPaquetesCreate && (
              <Button className="w-full sm:w-auto" onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Registrar paquete
              </Button>
            )}
          </div>
        }
      />

      {allPaquetes.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KpiCard
            icon={<Package className="h-5 w-5" />}
            label="Paquetes"
            value={stats.total}
            tone="primary"
          />
          <KpiCard
            icon={<Weight className="h-5 w-5" />}
            label="Con peso cargado"
            value={stats.conPeso}
            tone={stats.conPeso > 0 ? 'success' : 'neutral'}
          />
          <KpiCard
            icon={<Users className="h-5 w-5" />}
            label="Destinatarios únicos"
            value={stats.destinatarios}
            tone="neutral"
          />
          <KpiCard
            icon={<ClipboardList className="h-5 w-5" />}
            label="Vencidos"
            value={stats.vencidos}
            tone={stats.vencidos > 0 ? 'danger' : 'neutral'}
          />
        </div>
      )}

      {allPaquetes.length > 0 && (
        <FiltrosBar
          hayFiltrosActivos={tieneFiltros}
          onLimpiar={limpiarFiltros}
          chips={
            <>
              <ChipFiltro
                label="Todos"
                count={chipCounts.todos}
                active={chipActivo === 'todos'}
                onClick={() => setChipActivo('todos')}
              />
              <ChipFiltro
                label="Sin peso"
                count={chipCounts.sinPeso}
                active={chipActivo === 'sin_peso'}
                tone="warning"
                onClick={() => setChipActivo('sin_peso')}
              />
              <ChipFiltro
                label="Con peso"
                count={chipCounts.conPeso}
                active={chipActivo === 'con_peso'}
                tone="success"
                onClick={() => setChipActivo('con_peso')}
              />
              <ChipFiltro
                label="Sin guía master"
                count={chipCounts.sinGuiaMaster}
                active={chipActivo === 'sin_guia_master'}
                tone="neutral"
                onClick={() => setChipActivo('sin_guia_master')}
              />
              <ChipFiltro
                label="Vencidos"
                count={chipCounts.vencidos}
                active={chipActivo === 'vencidos'}
                tone="danger"
                onClick={() => setChipActivo('vencidos')}
                hideWhenZero
              />
            </>
          }
          filtros={
            (estadosDisponibles.length > 0 ||
              destinatarios.length > 0 ||
              codigosEnvio.length > 0 ||
              guiasMasterDisponibles.length > 0) && (
              <>
                {estadosDisponibles.length > 0 && (
                  <FiltroCampo label="Estado de rastreo" width="w-[14rem]">
                    <SearchableCombobox<string>
                      value={estadoFiltro}
                      onChange={(v) =>
                        setEstadoFiltro(v === undefined ? undefined : String(v))
                      }
                      options={estadosDisponibles.map((e) => e.codigo)}
                      getKey={(c) => c}
                      getLabel={(c) =>
                        estadosDisponibles.find((e) => e.codigo === c)?.nombre ?? c
                      }
                      placeholder="Todos"
                      searchPlaceholder="Buscar estado..."
                      emptyMessage="Sin estados"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
                {destinatarios.length > 0 && (
                  <FiltroCampo label="Destinatario" width="w-[16rem]">
                    <SearchableCombobox<string>
                      value={destinatarioFiltro}
                      onChange={(v) =>
                        setDestinatarioFiltro(
                          v === undefined ? undefined : String(v),
                        )
                      }
                      options={destinatarios}
                      getKey={(n) => n}
                      getLabel={(n) => n}
                      placeholder="Todos"
                      searchPlaceholder="Buscar destinatario..."
                      emptyMessage="Sin destinatarios"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
                {guiasMasterDisponibles.length > 0 && (
                  <FiltroCampo label="Guía master" width="w-[16rem]">
                    <SearchableCombobox<number>
                      value={guiaMasterFiltro}
                      onChange={(v) =>
                        setGuiaMasterFiltro(v === undefined ? undefined : Number(v))
                      }
                      options={guiasMasterDisponibles.map((g) => g.id)}
                      getKey={(id) => id}
                      getLabel={(id) =>
                        guiasMasterDisponibles.find((g) => g.id === id)?.trackingBase ??
                        `#${id}`
                      }
                      renderSelected={(id) => (
                        <span className="font-mono text-xs">
                          {guiasMasterDisponibles.find((g) => g.id === id)
                            ?.trackingBase ?? `#${id}`}
                        </span>
                      )}
                      renderOption={(id) => (
                        <span className="font-mono text-xs">
                          {guiasMasterDisponibles.find((g) => g.id === id)
                            ?.trackingBase ?? `#${id}`}
                        </span>
                      )}
                      placeholder="Todas"
                      searchPlaceholder="Buscar guía master..."
                      emptyMessage="Sin guías"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
                {hasPesoWrite && codigosEnvio.length > 0 && (
                  <FiltroCampo label="Envío consolidado" width="w-[14rem]">
                    <SearchableCombobox<string>
                      value={envioFiltro}
                      onChange={(v) =>
                        setEnvioFiltro(v === undefined ? undefined : String(v))
                      }
                      options={codigosEnvio}
                      getKey={(c) => c}
                      getLabel={(c) => c}
                      renderSelected={(c) => (
                        <span className="font-mono text-xs">{c}</span>
                      )}
                      renderOption={(c) => (
                        <span className="font-mono text-xs">{c}</span>
                      )}
                      placeholder="Todos"
                      searchPlaceholder="Buscar código..."
                      emptyMessage="Sin códigos"
                      className="h-9 w-full"
                    />
                  </FiltroCampo>
                )}
              </>
            )
          }
        />
      )}

      {list.length === 0 ? (
        <EmptyState
          icon={Package}
          title={allPaquetes.length === 0 ? 'No hay paquetes' : 'Sin resultados'}
          description={
            allPaquetes.length === 0
              ? 'Registra un paquete con su número de guía y destinatario para hacer seguimiento.'
              : tieneFiltros
                ? 'No hay paquetes que coincidan con los filtros aplicados.'
                : 'No se encontraron paquetes con ese criterio.'
          }
          action={
            allPaquetes.length === 0 && hasPaquetesCreate ? (
              <Button onClick={() => setCreateOpen(true)}>Registrar paquete</Button>
            ) : tieneFiltros ? (
              <Button variant="outline" onClick={limpiarFiltros}>
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {list.length} paquete{list.length === 1 ? '' : 's'}
            {list.length !== allPaquetes.length ? ` de ${allPaquetes.length}` : ''}
          </p>
        <ListTableShell>
            <Table className="table-mobile-cards min-w-[860px] text-left">
              <TableHeader>
                <TableRow>
                  <TableHead>Guía master / Pieza</TableHead>
                  <TableHead>Ref</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Destinatario</TableHead>
                  {hasPesoWrite && <TableHead>Guía de envío</TableHead>}
                  <TableHead>Contenido</TableHead>
                  <TableHead>Peso</TableHead>
                  {(hasPaquetesUpdate ||
                    hasPaquetesDelete ||
                    hasGuiasMasterUpdate) && (
                    <TableHead className="w-12 text-right" aria-label="Acciones" />
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell data-label="Guía master / Pieza" className="max-w-[14rem] align-top">
                      <GuiaMasterPiezaCell paquete={p} />
                    </TableCell>
                    <TableCell data-label="Ref" className="font-mono text-xs text-muted-foreground">{p.ref ?? '—'}</TableCell>
                    <TableCell data-label="Estado">
                      <StatusBadge tone="neutral">
                        {p.estadoRastreoNombre ?? p.estadoRastreoCodigo ?? '—'}
                      </StatusBadge>
                    </TableCell>
                    <TableCell data-label="Destinatario" className="align-top">
                      <DestinatarioCell paquete={p} />
                    </TableCell>
                    {hasPesoWrite && (
                      <TableCell data-label="Guía de envío">
                        {p.envioConsolidadoCodigo ? (
                          <div className="flex items-center gap-1.5">
                            <MonoTrunc
                              value={p.envioConsolidadoCodigo}
                              className="text-xs"
                            />
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {p.envioConsolidadoCerrado ? 'Cerrado' : 'Abierto'}
                            </Badge>
                          </div>
                        ) : (
                          <span className="text-xs italic text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell data-label="Contenido" className="text-muted-foreground">{p.contenido ?? '—'}</TableCell>
                    <TableCell data-label="Peso">
                      {p.pesoLbs != null || p.pesoKg != null
                        ? [p.pesoLbs != null ? `${p.pesoLbs} lbs` : null, p.pesoKg != null ? `${p.pesoKg} kg` : null]
                            .filter(Boolean)
                            .join(' / ')
                        : '—'}
                    </TableCell>
                    {(hasPaquetesUpdate ||
                      hasPaquetesDelete ||
                      hasGuiasMasterUpdate) && (
                      <TableCell data-label="Acciones" className="text-right">
                        <RowActionsMenu
                          items={[
                            {
                              label: 'Editar paquete',
                              icon: Pencil,
                              onSelect: () => setEditingPaquete(p),
                              hidden: !hasPaquetesUpdate,
                            },
                            {
                              label: 'Editar piezas de la guía',
                              icon: Layers,
                              onSelect: () => {
                                if (p.guiaMasterId != null) {
                                  setEditandoPiezasGuiaId(p.guiaMasterId);
                                }
                              },
                              hidden:
                                !hasGuiasMasterUpdate || p.guiaMasterId == null,
                            },
                            { type: 'separator' },
                            {
                              label: 'Eliminar',
                              icon: Trash2,
                              destructive: true,
                              onSelect: () => setDeleteConfirmId(p.id),
                              hidden: !hasPaquetesDelete,
                            },
                          ] satisfies RowActionEntry[]}
                        />
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
        </ListTableShell>
        </>
      )}

      {createOpen && (
        <PaqueteBulkCreateForm
          onClose={() => setCreateOpen(false)}
          onSuccess={() => setCreateOpen(false)}
        />
      )}

      {editingPaquete != null && (
        <PaqueteForm
          paquete={editingPaquete}
          onClose={() => setEditingPaquete(null)}
          onSuccess={() => setEditingPaquete(null)}
        />
      )}

      {editandoPiezasGuiaId != null && (
        <PaqueteBulkCreateForm
          editGuiaMasterId={editandoPiezasGuiaId}
          onClose={() => setEditandoPiezasGuiaId(null)}
          onSuccess={() => setEditandoPiezasGuiaId(null)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirmId != null}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Eliminar paquete"
        description="¿Estás seguro de que deseas eliminar este paquete? Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deletePaquete.isPending}
        onConfirm={async () => {
          if (deleteConfirmId == null) return;
          try {
            await deletePaquete.mutateAsync(deleteConfirmId);
            toast.success('Paquete eliminado correctamente');
          } catch (error: unknown) {
            toast.error(getApiErrorMessage(error) ?? 'Error al eliminar el paquete');
            throw error;
          }
        }}
      />
    </div>
  );
}
