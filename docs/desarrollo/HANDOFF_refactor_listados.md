# Handoff — Refactor de listados, filtros, KPIs y permisos

Documento de traspaso para retomar el refactor en otra sesión/agente.

- **Rama:** `refactor/listados-permisos-nomenclatura` (5 commits sobre `dev`, **sin push**).
- **DB dev:** `postgres` / `nSpass_01M` en `localhost:5432/ecubox_v1`.
- **Validación backend pesada:** test de contexto integral opt-in:
  `cd ecubox-backend && ECUBOX_RUN_BOOT_CONTEXT_TEST=true JWT_SECRET="<32+ chars>" DB_PASSWORD='nSpass_01M' DB_USERNAME=postgres ./mvnw -o test -Dtest=EcuboxSistemaDeGestionApplicationTests`
- **Validación frontend:** `cd ecubox-frontend && npx tsc --noEmit && npm run build && npm test -- --run && npm run lint:nomenclatura`

## Conclusión del diagnóstico (MVP 0)

El codebase está **más maduro** de lo que asumía el brief, lo que reduce el alcance:
- 18 listados ya usan `ListToolbar` + `FiltrosBar` + `ListTableShell` + `TablePagination` + empty/loading/error states.
- Permisos backend/frontend/rutas/roles ya alineados (auditado contra DB real).

## Estado por MVP

| MVP | Estado | Nota |
|---|---|---|
| 0 Diagnóstico | ✅ Hecho | — |
| 1 Nomenclatura | ✅ Hecho | Sidebar + `Seguimiento`→`Rastreo` + regla de linter |
| 2 Listados/filtros | 🟡 ~95% | Solo falta `mis-entregas` |
| 3 KPIs/rendimiento | 🟡 Flagship hecho | Falta auditoría conservadora del resto |
| 4 Backend filtros | 🟡 Flagship hecho | Falta recálculo *scoped* de vencimiento |
| 5 Permisos | ✅ Auditado | Alineado; **sin cambios de código** |
| 6 Permisos UI/botones | ⬜ Pendiente | No auditado a nivel botón |
| 7 Tests/verificación | 🟡 Parcial | Falta validación manual por rol |

## Ya entregado (no rehacer)

- **MVP 1** (`39477b6`, `5ed82a3`): labels de sidebar al glosario; `Seguimiento`→`Rastreo` en 15 archivos; nueva regla en `ecubox-frontend/scripts/lint-nomenclatura.mjs`.
- **Flagship Paquetes** (`d99f576`, `89104a4`, `25dfe5e`):
  - Flyway **V108** `paquete.fecha_limite_retiro` (aditiva) + índice parcial → "vencido" como predicado SQL.
  - `PaqueteService.computeFechaLimiteRetiro()` (equivalente exacto al booleano previo), recálculo en transición de estado y asignación de saca, backfill idempotente (`PaqueteVencimientoBackfillRunner`).
  - `GET /api/v1/paquetes/resumen` (`PAQUETES_READ`): KPIs + conteos por chip (respetando filtros) + opciones de filtro. `buildSpec` resuelve `vencidos` server-side.
  - Frontend: `usePaqueteResumen`, tabla 100% server-paginada, filtro consignatario por id, estados error/loading reescritos.
  - Documentado en `docs/desarrollo/API_REFERENCE.md`.

## Pendiente concreto (orden sugerido)

### 1. MVP 2 — `mis-entregas` sin `FiltrosBar` (bajo riesgo)
- Archivo: `ecubox-frontend/src/pages/dashboard/mis-entregas/MisEntregasPage.tsx`.
- Replicar patrón de `ecubox-frontend/src/pages/dashboard/lotes-recepcion/LoteRecepcionListPage.tsx`.
- Está en allowlist del linter por usar "Destinatario" (copy de cliente) — respetarlo.

### 2. MVP 6 — Auditoría de permisos a nivel botón/acción (medio)
- Por pantalla: crear/editar/eliminar/exportar/aplicar-estado/asignar/confirmar/masivas deben ocultarse o deshabilitarse según `useAuthStore(s => s.hasPermission('PERMISO'))`.
- Referencia correcta: `ecubox-frontend/src/pages/dashboard/paquetes/PaqueteListPage.tsx` (`hasPaquetesCreate/Update/Delete`).
- Acciones de fila → `RowActionsMenu`.
- Matriz real por rol:
  `SELECT p.codigo FROM rol r JOIN rol_permiso rp ON rp.rol_id=r.id JOIN permiso p ON p.id=rp.permiso_id WHERE r.nombre='OPERARIO' ORDER BY 1;` (idem CLIENTE / ACCESO_ENLACE).

### 3. MVP 3 — Auditoría KPI conservadora del resto (bajo–medio)
- 33 archivos usan `KpiCard`/`KpiCardsGrid`; la mayoría derivan de datos ya cargados (impacto bajo).
- Buscar el anti-patrón "cargar todo solo para KPIs" (como era Paquetes) en: `GuiasMasterPage`, `EnviosConsolidadosListPage`, `LoteRecepcionListPage`, `DespachoListPage`. Si descargan el dataset completo, replicar el enfoque `/resumen`.
- Regla: máx 2–3 KPIs decisorios; reemplazar decorativos por resumen en `FiltrosBar`/chips.

### 4. MVP 4 — Recálculo *scoped* de vencimiento tras editar config (producto + backend)
- `fecha_limite_retiro` puede quedar obsoleta si admin edita `diasMaxRetiro*` (courier/agencia/agencia-courier) o los estados de cuenta regresiva (`ParametroSistema`).
- Cablear `PaqueteService.recomputarFechaLimiteRetiroBatch(ids)` (ya existe) desde los flujos de edición de despacho/courier/agencia/parámetros.
- Decisión de producto: recálculo automático vs aceptar staleness hasta el siguiente evento del paquete.

### 5. MVP 7 — Validación manual por rol (requiere app)
- `cd ecubox-backend && JWT_SECRET=<...> DB_PASSWORD=nSpass_01M ./mvnw spring-boot:run` + `cd ecubox-frontend && npm run dev`.
- Probar ADMIN/OPERARIO/CLIENTE: navegación visible, filtros, limpiar, paginación, acciones por permiso, responsive, claro/oscuro.

## Notas operativas

- **Drift dev DB:** OPERARIO tiene `AGENCIAS_WRITE`/`COURIERS_ENTREGA_WRITE`/`PUNTOS_ENTREGA_WRITE` que **ninguna migración concede** (V9 solo a ADMIN). No es bug de código; resetear dev desde migraciones para reflejar prod.
- **`docs/usuario/GUIA_ESTADOS_Y_SEGUIMIENTO.md`:** nombre de archivo con "SEGUIMIENTO" (no es copy de app; renombrar es cosmético y puede romper enlaces).
- **Conflicto resuelto:** el copy público "Seguimiento" estaba en allowlist del linter pero `docs/nomenclatura.md` ya lo prohibía; se decidió migrar todo a "Rastreo".

## Criterios de aceptación — estado

- ✅ Filtros consistentes reutilizando componentes existentes.
- ✅ Paquetes (y patrón replicable) no dependen del dataset completo.
- ✅ Permisos backend/frontend/navegación/roles alineados.
- ✅ Sin labels visibles con nomenclatura prohibida.
- ✅ Tests backend (contexto) + frontend (101) + build verdes.
- ⬜ `mis-entregas` con filtros · auditoría de botones por permiso · validación manual por rol · KPI sweep del resto.
