import { Calculator } from 'lucide-react';
import { TarifaCalculadoraForm } from './TarifaCalculadoraForm';

export function TarifaCalculadoraPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <Calculator className="h-7 w-7" />
          Tarifa calculadora (por libra)
        </h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Esta tarifa se usa en la página pública de calculadora de envío. El operario puede modificarla aquí.
        </p>
      </div>

      <TarifaCalculadoraForm />
    </div>
  );
}
