import { Link, useParams } from '@tanstack/react-router';
import { useDespacho } from '@/hooks/useOperarioDespachos';
import { LoadingState } from '@/components/LoadingState';
import { DespachoStepperForm } from './DespachoStepperForm';

export function EditarDespachoPage() {
  const params = useParams({ strict: false });
  const id = params.id;
  const despachoId = id != null ? Number(id) : NaN;
  const { data: despacho, isLoading: loadingDespacho, error } = useDespacho(Number.isNaN(despachoId) ? undefined : despachoId);

  if (Number.isNaN(despachoId)) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
        ID de despacho no válido.
        <Link to="/despachos" className="ml-2 underline">Volver a despachos</Link>
      </div>
    );
  }

  if (loadingDespacho) {
    return <LoadingState text="Cargando despacho..." />;
  }

  if (error || !despacho) {
    return (
      <div className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)]">
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
