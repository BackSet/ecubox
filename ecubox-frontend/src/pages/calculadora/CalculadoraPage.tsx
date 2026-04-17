import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import { EcuboxLogo } from '@/components/brand';
import { getTarifaCalculadoraPublic } from '@/lib/api/tarifa-calculadora.service';
import { onKeyDownNumericDecimal, sanitizeNumericDecimal } from '@/lib/inputFilters';
import { lbsToKg, kgToLbs } from '@/lib/utils/weight';
import { Calculator } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const MIN_PESO_LBS_RECARGO = 4;
const RECARGO_ENVIO_MENOR_PESO = 3.5;

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
      setPesoKg(String(lbsToKg(n)));
    } else {
      setPesoKg('');
    }
  };

  const handleKgChange = (value: string) => {
    const sanitized = sanitizeNumericDecimal(value);
    setPesoKg(sanitized);
    const n = sanitized === '' ? NaN : Number(sanitized);
    if (!Number.isNaN(n) && n >= 0) {
      setPesoLbs(String(kgToLbs(n)));
    } else {
      setPesoLbs('');
    }
  };

  const pesoLbsNum = pesoLbs === '' ? NaN : Number(pesoLbs);
  const hasValidPeso = !Number.isNaN(pesoLbsNum) && pesoLbsNum > 0;
  const tarifa = tarifaPorLibra ?? 0;
  const costoBase = hasValidPeso && tarifa >= 0 ? pesoLbsNum * tarifa : null;
  const aplicaRecargo = hasValidPeso && pesoLbsNum < MIN_PESO_LBS_RECARGO;
  const recargoEnvio = aplicaRecargo ? RECARGO_ENVIO_MENOR_PESO : 0;
  const costoEstimado = costoBase != null ? costoBase + recargoEnvio : null;

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex flex-col">
      <header className="border-b border-[var(--color-border)]">
        <div className="content-container-wide mobile-safe-inline flex items-center justify-between gap-3 py-3 sm:py-4">
          <Link to="/" className="inline-flex p-1 -m-1 rounded-lg hover:bg-[var(--color-muted)] transition" aria-label="ECUBOX - Inicio">
            <EcuboxLogo variant="light" size="lg" asLink={false} />
          </Link>
          <Link
            to="/"
            className="text-xs sm:text-sm text-[var(--color-muted-foreground)] hover:underline"
          >
            Volver al inicio
          </Link>
        </div>
      </header>

      <main className="mobile-safe-inline flex-1 py-6 sm:py-10">
        <div className="content-container w-full max-w-2xl space-y-5 sm:space-y-6">
          <div className="text-center space-y-2">
            <h1 className="responsive-title font-bold text-[var(--color-foreground)]">
              Calculadora de envío
            </h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Ingresa el peso para obtener un costo estimado todo incluido con transporte Servientrega.
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
              <div className="surface-card p-4 sm:p-5 text-sm text-[var(--color-muted-foreground)]">
                Tarifa actual: <strong className="text-[var(--color-foreground)]">${tarifa.toFixed(2)} USD / libra</strong>
                <p className="mt-2">
                  Transporte Servientrega incluido. Si el paquete pesa menos de {MIN_PESO_LBS_RECARGO} lb, se suma un recargo fijo de ${RECARGO_ENVIO_MENOR_PESO.toFixed(2)}.
                </p>
              </div>

              <div className="surface-card p-4 sm:p-5 space-y-4">
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
                <div className="surface-card p-5 sm:p-6 space-y-1">
                  <div className="flex items-center gap-2 text-[var(--color-foreground)]">
                    <Calculator className="h-5 w-5 text-[var(--color-muted-foreground)]" />
                    <span className="font-medium">Costo estimado</span>
                  </div>
                  <p className="text-2xl font-bold text-[var(--color-foreground)]">
                    ${costoEstimado.toFixed(2)} USD
                  </p>
                  {costoBase != null && aplicaRecargo ? (
                    <div className="space-y-0.5 text-sm text-[var(--color-muted-foreground)]">
                      <p>{pesoLbsNum} lbs × ${tarifa.toFixed(2)}/lb = ${costoBase.toFixed(2)}</p>
                      <p>Recargo envío (&lt; {MIN_PESO_LBS_RECARGO} lb): +${RECARGO_ENVIO_MENOR_PESO.toFixed(2)}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      {pesoLbsNum} lbs × ${tarifa.toFixed(2)}/lb
                    </p>
                  )}
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
