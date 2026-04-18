import { Calculator } from 'lucide-react';
import { TarifaCalculadoraForm } from './TarifaCalculadoraForm';
import { PageHeader } from '@/components/PageHeader';

export function TarifaCalculadoraPage() {
  return (
    <div className="page-stack">
      <PageHeader
        icon={<Calculator className="h-5 w-5" />}
        title="Tarifa calculadora (por libra)"
        description="Esta tarifa se usa en la página pública de calculadora de envío. El operario puede modificarla aquí."
      />
      <TarifaCalculadoraForm />
    </div>
  );
}
