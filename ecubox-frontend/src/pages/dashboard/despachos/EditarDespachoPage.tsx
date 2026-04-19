import { Link, useParams } from '@tanstack/react-router';
import { useDespacho } from '@/hooks/useOperarioDespachos';
import { DetailHeaderSkeleton } from '@/components/skeletons/DetailHeaderSkeleton';
import { FormSkeleton } from '@/components/skeletons/FormSkeleton';
import { SurfaceCardSkeleton } from '@/components/skeletons/SurfaceCardSkeleton';
import { DespachoStepperForm } from './DespachoStepperForm';

export function EditarDespachoPage() {
  const params = useParams({ strict: false });
  const id = params.id;
  const despachoId = id != null ? Number(id) : NaN;
  const { data: despacho, isLoading: loadingDespacho, error } = useDespacho(Number.isNaN(despachoId) ? undefined : despachoId);

  if (Number.isNaN(despachoId)) {
    return (
      <div className="ui-alert ui-alert-error">
        ID de despacho no válido.
        <Link to="/despachos" className="ml-2 underline">Volver a despachos</Link>
      </div>
    );
  }

  if (loadingDespacho) {
    return (
      <div className="page-stack" aria-busy="true" aria-live="polite">
        <DetailHeaderSkeleton badges={1} metaLines={1} />
        <SurfaceCardSkeleton bodyLines={2} />
        <FormSkeleton fields={6} withTextarea withFooter />
        <span className="sr-only">Cargando despacho...</span>
      </div>
    );
  }

  if (error || !despacho) {
    return (
      <div className="ui-alert ui-alert-error">
        No se pudo cargar el despacho.
        <Link to="/despachos" className="ml-2 underline">Volver a despachos</Link>
      </div>
    );
  }

  return (
    <DespachoStepperForm
      mode="edit"
      despacho={despacho}
      title="Editar despacho"
      subtitle="Modifica los datos del despacho y las sacas asignadas."
      submitLabel="Guardar cambios"
      submitLoadingLabel="Guardando..."
    />
  );
}
