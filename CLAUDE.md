# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

ECUBOX is a logistics system for shipments between the USA and Ecuador (packages, master guides, dispatches, manifests, settlements, reception, public tracking, PWA notifications). The domain language is **Spanish** — keep domain terms in Spanish.

## Monorepo layout

- `ecubox-backend/` — REST API, Java 25 + Spring Boot 4.0.6, PostgreSQL, Flyway.
- `ecubox-frontend/` — SPA/PWA, React 19 + TypeScript + Vite, TanStack Router/Query, Zustand.
- `docs/` — architecture, dev, deploy docs. `docs/nomenclatura.md` is the **canonical glossary** (see below).
- `docker-compose.yml` — Postgres 18 + backend + frontend. `.env` at repo root holds `DB_PASSWORD`, `JWT_SECRET`, etc.

## Commands

Backend (`cd ecubox-backend`, reads root `.env`, default Spring profile `dev` connecting to `localhost:5432/ecubox_v1`):
- Compile: `./mvnw -q -o compile`
- All tests: `./mvnw test`
- Single test: `./mvnw test -Dtest='PaqueteServiceTest#metodo'`
- Run API (port 8080): `./mvnw spring-boot:run`

Frontend (`cd ecubox-frontend`):
- Dev server (port 5173): `npm run dev`
- **Typecheck** (use after edits — there is no `eslint` script): `npx tsc --noEmit`
- All tests: `npm test` (Vitest) — single test: `npx vitest run src/path/to/file.test.tsx`
- Build: `npm run build`
- Domain-term lint: `npm run lint:nomenclatura`

Full stack: `docker compose up --build` (frontend on :80, API on :8080).

## Database migrations & dev seed (important)

- Flyway versioned migrations live in `ecubox-backend/src/main/resources/db/migration/` (`V<n>__*.sql`). **Never edit an already-applied migration** — add a new one.
- `db/dev/` holds **dev-only** seeds, loaded only under the `dev` profile via `spring.flyway.locations` in `application-dev.properties` (prod uses the default location and never sees `db/dev`). The state catalog seed there is a **repeatable** migration (`R__`, idempotent) that aligns dev with production data.
- In `dev`, `DevFlywayConfig` runs `flyway.repair()` before `migrate()` so changed checksums are tolerated; prod does not.
- To validate raw SQL without a full app boot, run it inside `BEGIN … ROLLBACK` against the dev DB via `psql` (sourcing `.env` for the password, never echoing it).

## Backend architecture

- Layering: **Controller → Service → Repository**. Controllers exchange DTOs only (never expose JPA entities); validation via Jakarta `@Valid` on DTOs. Entity↔DTO mapping happens in services (the `Paquete` module uses a dedicated `PaqueteMapper`).
- Security: JWT filter sets the `SecurityContext`; endpoints are gated with `@PreAuthorize("hasAuthority('PERMISO')")` / `hasAnyAuthority(...)`. Permissions and role grants are seeded through Flyway (`permiso`, `rol_permiso` tables). Roles: `ADMIN`, `OPERARIO`, `CLIENTE`, and `ACCESO_ENLACE` (magic-link sessions scoped to a set of consignatarios — see `AccesoSessionResolver`).
- Public tracking is unauthenticated: `GET /api/v1/tracking?codigo=...`.

## State management domain (cross-cutting, read before touching states)

This is the most architecturally significant area and spans many files.

- **`estado_rastreo`** is a configurable catalog (codes/names/order are admin-editable). Code must **never hardcode state codes** for logic — resolve them through `ParametroSistemaService`.
- **"Estados por punto"** are stored as system parameters (`parametro_sistema`) mapping flow milestones (registro, lote, asociar guía master, despacho, sale de origen, llega a destino, avance masivo, confirmación de entrega, …) to a catalog state **id**. The flow applies them automatically via `PaqueteService.aplicarEstado*`. Manual changes happen in the **`/gestionar-estados-paquetes`** hub (Paquetes / Guías master / Consolidados tabs).
- Guía master state (`EstadoGuiaMaster`) is mostly derived (recalculated); only `cancelar`/`marcar-en-revision`/`salir-de-revision`/`recalcular` are manual.
- Consolidado operative state (`EstadoEnvioConsolidadoOperativo`) is **derived, not persisted** (`EstadoConsolidadoOperativoResolver`); only `enviarDesdeUsa` and `reabrir` are real manual transitions.

## Frontend architecture

- Routing: code-based TanStack Router in `src/routes/router.tsx` (`createRoute`, lazy-loaded pages, `requirePermission` / `requireAnyPermission` guards). Sidebar/nav in `src/app/navigation/dashboardNav.ts`.
- Data: TanStack Query hooks in `src/hooks/` calling typed services in `src/lib/api/*.service.ts`, which use the shared axios `apiClient` (`src/lib/api/client.ts`) and path constants in `src/lib/api/endpoints.ts`.
- Auth/permissions: Zustand `useAuthStore` — gate UI with `useAuthStore((s) => s.hasPermission('PERMISO'))`.
- UI: shadcn/Radix primitives in `src/components/ui/`. PDF export reuses helpers in `src/lib/pdf/builders/internal-doc.ts`; Excel export reuses `src/lib/xlsx/builders.ts`.
- Pages live in `src/pages/dashboard/<feature>/`; types in `src/types/`.

## Nomenclatura (enforced)

`docs/nomenclatura.md` is the single source of truth for domain terms (e.g. **Casillero**, **Guía master**, **Pieza** vs **Paquete**, **Consignatario**, **Despacho**, **Rastreo** not "Tracking", **lbs** not "lb"). Any new domain term must be added there **first**; introducing a banned synonym is a bug. `npm run lint:nomenclatura` checks this.

## Conventions

- Branch from the main branch; keep changes focused.
- Verify before finishing: backend `./mvnw test` (or `compile`), frontend `npx tsc --noEmit` + `npm test`.
- In PRs/commits, explicitly flag Flyway migrations, env-var changes, and breaking changes.
