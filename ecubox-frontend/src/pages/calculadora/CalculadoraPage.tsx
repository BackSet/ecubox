import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { EcuboxLogo } from '@/components/brand';
import { getTarifaCalculadoraPublic } from '@/lib/api/tarifa-calculadora.service';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function CalculadoraPage() {
  const [tarifaPorLibra, setTarifaPorLibra] = useState<number | null>(null);
  const [tarifaError, setTarifaError] = useState<string | null>(null);
  const [pesoLbs, setPesoLbs] = useState<string>('');
  const [pesoKg, setPesoKg] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    setTarifaError(null);
    getTarifaCalculadoraPublic()
      .then((data) => {
        if (!cancelled) setTarifaPorLibra(data.tarifaPorLibra);
      })
      .catch(() => {
        if (!cancelled) setTarifaError('No se pudo cargar la tarifa.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLbsChange = (value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    setPesoLbs(sanitized);
    const n = sanitized === '' ? NaN : Number(sanitized);
    if (!Number.isNaN(n) && n >= 0) {
      setPesoKg(String(Math.round((n / 2.20462262185) * 100) / 100));
    } else {
      setPesoKg('');
    }
  };

  const handleKgChange = (value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    setPesoKg(sanitized);
    const n = sanitized === '' ? NaN : Number(sanitized);
    if (!Number.isNaN(n) && n >= 0) {
      setPesoLbs(String(Math.round(n * 2.20462262185 * 100) / 100));
    } else {
      setPesoLbs('');
    }
  };

  const pesoLbsNum = pesoLbs === '' ? NaN : Number(pesoLbs);
  const hasValidPeso = !Number.isNaN(pesoLbsNum) && pesoLbsNum > 0;
  const tarifa = tarifaPorLibra ?? 0;
  const costoEstimado = hasValidPeso && tarifa >= 0 ? pesoLbsNum * tarifa : null;

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <header className="border-b border-[var(--color-border)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="inline-flex p-1 -m-1 rounded-lg hover:bg-[var(--color-muted)] transition" aria-label="ECUBOX - Inicio">
            <EcuboxLogo variant="light" size="lg" asLink={false} />
          </Link>
          <Link
            to="/"
            className="text-sm text-[var(--color-muted-foreground)] hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Calculadora de envío
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Ingresa el peso para obtener un costo estimado (tarifa por libra).
            </p>
          </div>

          {tarifaError && (
            <div
              className="rounded-md bg-[var(--color-destructive)]/10 p-4 text-[var(--color-destructive)] text-sm"
              role="alert"
            >
              {tarifaError}
            </div>
          )}

          {tarifaPorLibra !== null && !tarifaError && (
            <>
              <div className="surface-card p-4 text-sm text-[var(--color-muted-foreground)]">
                Tarifa actual: <strong className="text-[var(--color-foreground)]">${tarifa.toFixed(2)} USD / libra</strong>
              </div>

              <div className="surface-card p-5 space-y-4">
                <div>
                  <Label htmlFor="pesoLbs" className="mb-1 block">
                    Peso (libras)
                  </Label>
                  <Input
                    id="pesoLbs"
                    type="text"
                    inputMode="decimal"
                    value={pesoLbs}
                    onChange={(e) => handleLbsChange(e.target.value)}
                    onKeyDown={(e) => onKeyDownNumericDecimal(e, pesoLbs)}
                    placeholder="0"
                    className="input-clean px-4 py-3"
                  />
                </div>
                <div>
                  <Label htmlFor="pesoKg" className="mb-1 block">
                    Peso (kg)
                  </Label>
                  <Input
                    id="pesoKg"
                    type="text"
                    inputMode="decimal"
                    value={pesoKg}
                    onChange={(e) => handleKgChange(e.target.value)}
                    onKeyDown={(e) => onKeyDownNumericDecimal(e, pesoKg)}
                    placeholder="0"
                    className="input-clean px-4 py-3"
                  />
                </div>
              </div>

              {tarifa === 0 && (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  La tarifa aún no ha sido configurada. El costo estimado no está disponible.
                </p>
              )}

              {costoEstimado !== null && tarifa > 0 && (
                <div className="surface-card p-6 space-y-1">
                  <div className="flex items-center gap-2 text-[var(--color-foreground)]">
                    <Calculator className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                    <span className="font-medium">Costo estimado</span>
                  </div>
                  <p className="text-2xl font-bold text-[var(--color-foreground)]">
                    ${costoEstimado.toFixed(2)} USD
                  </p>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {pesoLbsNum} lbs × ${tarifa.toFixed(2)}/lb
                  </p>
                </div>
              )}
            </>
          )}

          {tarifaPorLibra === null && !tarifaError && (
            <p className="text-sm text-[var(--color-muted-foreground)]">Cargando tarifa...</p>
          )}
        </div>
      </main>
    </div>
  );
}
