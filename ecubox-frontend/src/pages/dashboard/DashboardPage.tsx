export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="surface-card p-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Panel operativo
        </h1>
        <p className="mt-2 text-[var(--color-muted-foreground)]">
          Gestiona despachos, paquetes, lotes y manifiestos desde un flujo unificado.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="surface-card p-5">
          <p className="text-sm text-[var(--color-muted-foreground)]">Prioridad</p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">Despachos del día</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-[var(--color-muted-foreground)]">Seguimiento</p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">Lotes de recepción</p>
        </div>
        <div className="surface-card p-5">
          <p className="text-sm text-[var(--color-muted-foreground)]">Control</p>
          <p className="mt-1 text-lg font-semibold text-[var(--color-foreground)]">Estados y parámetros</p>
        </div>
      </div>
    </div>
  );
}
