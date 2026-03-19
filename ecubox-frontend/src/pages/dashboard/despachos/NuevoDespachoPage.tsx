import { DespachoStepperForm } from './DespachoStepperForm';

export function NuevoDespachoPage() {
  return (
    <DespachoStepperForm
      mode="create"
      title="Nuevo despacho"
      subtitle="Completa los datos del envío y añade sacas existentes o crea nuevas."
      submitLabel="Crear despacho"
      submitLoadingLabel="Creando..."
    />
  );
}
