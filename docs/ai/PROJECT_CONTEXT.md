# Contexto técnico canónico de ECUBOX

> Corte funcional auditado: rama `dev`, `HEAD d81b513` — actualizado 2026-06-20.
>
> Etiquetas de evidencia:
> - **Verificado en Git**: código, configuración, migraciones, tests o historial de la rama.
> - **Verificado en documentación**: afirmación presente en documentación, sin elevarla sobre el código.
> - **Inferido**: conclusión razonable que no está declarada como contrato.
> - **Pendiente de confirmar**: no hay evidencia suficiente en la rama.

## 1. Identificación

| Campo | Valor | Evidencia |
|---|---|---|
| Proyecto | ECUBOX | **Verificado en Git**: `README.md`, manifiestos y paquetes raíz. |
| Repositorio | `BackSet/ecubox` | **Verificado en Git**: `origin=https://github.com/BackSet/ecubox.git`. |
| Rama principal de este análisis | `dev` | **Verificado en Git**: rama activa y alineada con `origin/dev` en el corte auditado. |
| Rama predeterminada remota | `main` | **Verificado en Git**: `origin/HEAD -> main`. |
| Rama de producción | No confirmada como contrato formal | **Pendiente de confirmar**: `main` es la rama predeterminada y recibe CI en `push`, pero los archivos de Railway no declaran una rama de despliegue. |
| Tipo de repositorio | Monorepositorio con frontend, backend, documentación e infraestructura | **Verificado en Git**. |
| Dominio funcional | Gestión logística de envíos entre Estados Unidos y Ecuador: casillero, guías master, piezas/paquetes, consolidación, recepción, despacho, liquidación, rastreo y notificaciones | **Verificado en Git**: código, rutas, entidades y `README.md`. |

## 2. Estructura

| Área | Ruta | Contenido |
|---|---|---|
| Frontend | `ecubox-frontend/` | SPA/PWA React; rutas, páginas, hooks, servicios API, stores, validación y exportadores. |
| Backend | `ecubox-backend/` | API REST Spring Boot organizada por controllers, services, repositories, DTOs, entidades, mappers y configuración. |
| Documentación | `docs/` | Desarrollo, despliegue, OpenAPI, usuario, branding, pruebas y nomenclatura. |
| Contexto IA | `docs/ai/` | Estos cuatro archivos canónicos. |
| Infraestructura local | `docker-compose.yml`, `*/Dockerfile`, `ecubox-frontend/Caddyfile` | PostgreSQL, backend y frontend servido por Caddy. |
| Despliegue | `ecubox-backend/railway.json`, `ecubox-frontend/railway.json`, `docs/despliegue/` | Configuración y guía de Railway. |
| Migraciones | `ecubox-backend/src/main/resources/db/migration/` | Flyway `V1` a `V120` (119 archivos; numeración no contigua: falta `V70`). |
| Seed de desarrollo | `ecubox-backend/src/main/resources/db/dev/` | Migración repetible solo del perfil `dev`. |
| Tests backend | `ecubox-backend/src/test/java/` | JUnit/Spring Test/Mockito; predominan unitarios y pruebas HTTP aisladas. |
| Tests frontend | `ecubox-frontend/src/**/*.test.{ts,tsx}` | Vitest, Testing Library y jsdom. |
| CI | `.github/workflows/ci.yml` | Tests backend, instalación/test/build frontend. |

## 3. Stack confirmado

### Backend

- Java 25 y Spring Boot 4.0.7.
- Maven Wrapper; manifiesto `ecubox-backend/pom.xml`.
- Spring MVC, Security, Data JPA, Validation y Flyway.
- PostgreSQL; imagen local `postgres:18-alpine`.
- Flyway 12.6.2 con módulo PostgreSQL.
- JWT con JJWT 0.13.0.
- OpenAPI/Scalar con Springdoc 3.0.3.
- Lombok 1.18.46 y MapStruct 1.6.3.
- Bucket4j 8.19.0, Micrometer, PDFBox 3.0.7, Apache POI 5.5.1 y Web Push 5.1.2.
- Observabilidad (MVP 7/8): `spring-boot-starter-actuator` (health/info/metrics). Tracing OTEL **vía Java agent** (opt-in por entorno, sin dependencias en el `pom.xml`); logs con `trace_id`/`span_id` cuando el agente inyecta el MDC. Ver [docs/operacion/OBSERVABILIDAD.md](../operacion/OBSERVABILIDAD.md).
- Auditoría modular (MVP 8/8): **Spring Modulith 2.0.7** (alineado con Boot 4.0.x; `2.1.x`=Boot 4.1), solo en `scope test` (`spring-modulith-starter-test`, `spring-modulith-docs`). Test `ModulithStructureTest` (no arranca Spring). Ver [docs/desarrollo/MODULITH_AUDITORIA.md](../desarrollo/MODULITH_AUDITORIA.md).
- Tests mediante `spring-boot-starter-test` y Maven Surefire; integración con PostgreSQL real vía Testcontainers (módulos `testcontainers-junit-jupiter` y `testcontainers-postgresql`, gestionados por el BOM de Spring Boot).

### Frontend

- React 19.2.7, TypeScript 6.0.3 y Vite 8.1.0.
- Node.js 22 en CI y Docker.
- npm con lockfile `ecubox-frontend/package-lock.json`.
- TanStack Router 1.170.16 y TanStack Query 5.101.1.
- **`openapi-fetch` 0.17.0 es el único cliente HTTP** (Axios fue retirado por completo en MVP 6/8). Dos clientes: `openapiClient` (autenticado: JWT + 401/errores) y `openapiPublicClient` (sin token ni redirección, para endpoints públicos). Tipos generados desde OpenAPI con `openapi-typescript` (vía `npx`, no es dependencia del proyecto por incompatibilidad de peer con TypeScript 6).
- Zustand 5.0.13, React Hook Form 7.80.0 y Zod 4.4.3.
- Tailwind CSS 4.3.1, Radix UI/shadcn, Lucide y Sonner.
- PWA con `vite-plugin-pwa`; generación de iconos con Sharp.
- Exportación con jsPDF, ExcelJS y `html-to-image`.
- Vitest 4.1.9, Testing Library, jsdom y cobertura V8.

Las versiones anteriores están **verificadas en Git** en `pom.xml`, `package.json` y lockfiles. `docs/desarrollo/TECH-STACK.md` contiene varias versiones anteriores y no debe usarse para fijar versiones sin cotejo.

## 4. Arquitectura

### Frontend

- `src/routes/router.tsx` declara rutas públicas y privadas con TanStack Router y carga diferida.
- Rutas legales públicas canónicas: `/terminos-y-condiciones`, `/politica-de-privacidad` y `/politica-de-cookies`; `/terminos` y `/privacidad` redirigen por compatibilidad. La aceptación legal del registro es validación UI, sin persistencia backend confirmada.
- `src/pages/` agrupa páginas por área funcional.
- `src/components/` contiene componentes compartidos y primitivos UI.
- `src/hooks/` encapsula consultas/mutaciones de TanStack Query y lógica reutilizable.
- `src/lib/api/` centraliza los clientes `openapi-fetch` (`openapi-client.ts`), los tipos generados (`generated/`) y los servicios por dominio.
- `src/types/` define contratos TypeScript; `src/lib/schemas/` contiene validación Zod.
- `src/stores/authStore.ts` y `themeStore.ts` manejan estado de cliente con Zustand.
- La autorización de navegación se comprueba con permisos antes de cargar rutas; esto mejora UX, pero el backend sigue siendo la autoridad de seguridad.
- **Sistema de diseño y movimiento**: `src/index.css` define tokens globales de color/radio y de **movimiento** (`--motion-fast|normal|slow|emphasis`, curvas `--motion-ease-standard|enter|exit|emphasized`) más utilidades semánticas (`.ui-transition`, `.ui-interactive`, `.ui-surface-hover`, `.ui-motion-*`). Todo respeta `prefers-reduced-motion`. La referencia operativa es `ecubox-frontend/UI_GUIDELINES.md`. Regla global: no `transition-all` ni duraciones/curvas literales dispersas.
- **Identidad de marca (rebranding, MVP 1 — fundamentos)**: paleta canónica negro carbón `#0D0D0F` / grafito `#2A2A30` / gris claro `#F2F3F5` / violeta ECUBOX `#6C5CE7` / violeta suave `#EDE9FE`, mapeada a los tokens shadcn de `src/index.css` (light y `.dark`, sin romper el modo oscuro); tipografía global **Sora** (Google Fonts, SIL OFL) como `--font-sans`/`--font-display`, cargada en `index.html`. El **símbolo de marca** es el monograma «ec» enlazado (lazo de conexión/infinito; reemplaza la antigua «e»), geometría provista por el equipo de marca y optimizada en la fuente única `ecubox-frontend/scripts/brand-glyphs.mjs` → genera lockups **monocromos** en `src/assets/brand/ecubox-{symbol,logo-horizontal,logo-stacked}-{light,dark}.svg` (`generate-brand-assets.mjs`), favicons (`generate-favicons.mjs`) e iconos PWA (`generate-pwa-icons.mjs`), todo cableado en `npm run build`/`icons:generate`. El **icono de la app/avatar es negro carbón** (badge `#2A2A30→#0D0D0F`) con el símbolo en blanco; el violeta es acento de UI (no se usa en el logo ni en el icono). El logo se consume vía `EcuboxLogo` (`@/components/brand`); los PDFs frontend usan `src/lib/pdf/brand-logo.ts` con DataURLs generadas desde los lockups oficiales, nunca lockups dibujados manualmente. `src/lib/theme-colors.ts` sincroniza `theme-color`/favicon (`?v=8`). Detalle: `docs/branding/IDENTIDAD_VISUAL.md`, `UI_GUIDELINES.md` §1.6.
- **Estándar responsive** (`UI_GUIDELINES.md` §5.5): viewports canónicos 320–1720 px; a 320 px ninguna página produce scroll horizontal. Regla global: hijos flex que truncan llevan `min-w-0`; controles `w-full max-w-full` en móvil con ancho limitado solo desde breakpoint; tablas desplazan su contenedor (`ListTableShell`/`.table-responsive`), no la página; popovers/dialogs acotados al viewport; prohibido ocultar overflow con `overflow-x-hidden` global. Controles compartidos `SelectTrigger`/`SelectContent`/`SearchableCombobox` endurecidos con `min-w-0`/`max-w` al viewport.
- **Navegación por audiencia** (regla global; `UI_GUIDELINES.md` §2): el sidebar **no** es un único orden global filtrado por permisos. `src/app/navigation/dashboardNav.ts` define un **catálogo canónico de items** (`NAV`, cada ruta/icono/permiso una sola vez) y **composiciones por audiencia** (cliente, operario, admin, acceso por enlace) seleccionadas en `composeForAudience` **a partir de permisos** (nunca del nombre del rol). El usuario mixto (operario+cliente, no admin) usa el árbol operativo + grupo «Mi cuenta». El rótulo por audiencia se resuelve con `NavItem.labelFor` sobre la misma ruta. `Sidebar` y `GlobalCommandPalette` consumen `getVisibleNavGroups`/`getVisibleNavItems`; los grupos sin items visibles se ocultan.
- **Patrón canónico de bandejas** (`UI_GUIDELINES.md` §3 «Bandejas»): cuando un módulo se divide en **universos de trabajo mutuamente excluyentes** se usa el componente compartido `src/components/BandejaTabs.tsx` (no se duplica el JSX por módulo). Una **bandeja** (cambia el dataset base, su contador y su contexto) se distingue de un **filtro** (reduce el universo activo), un **paso** (etapa de captura) y un **modo** (cómo se ejecuta una herramienta local); `SegmentedControl`/tablists usados como paso/modo **no** se migran. Consumidores: `/paquetes` y `/guias-master`. Contratos: la bandeja activa se persiste en la URL (`?bandeja=`), forma parte de la queryKey del listado y del resumen (placeholder solo dentro de la misma bandeja), y sus contadores provienen del resumen del backend (`PaqueteResumenDTO.bandejas`, dashboard de guías) sin descargar datasets.

### Backend

- Flujo predominante: `Controller -> Service -> Repository -> PostgreSQL`.
- Los controllers trabajan con DTOs; los services concentran reglas y transacciones.
- Persistencia con entidades JPA y repositorios Spring Data.
- Mapeo mixto: MapStruct en `AgenciaMapper`, `CourierEntregaMapper`, `EstadoRastreoMapper`, `PermisoMapper` y `RolMapper`; otros servicios realizan mapeo directo.
- Búsquedas paginadas usan `PageResponse`, `Pageable`, Specifications y proyecciones según el módulo.
- Procesos programados y event-driven viven en `scheduler/`, `event/`, `projection/` y servicios de outbox/rastreo.
- **Contenido público configurable** (regla global): el contenido editable del sitio público se sirve por endpoints públicos sin autenticación bajo `/api/config/*` o `/api/public/*`, devolviendo **solo campos públicos** (sin auditoría/estado técnico/versión) y un **patrón vacío** cuando no hay contenido (nunca 404). Las campañas de la landing (`campania_landing`) siguen este patrón: administración bajo `/api/parametros-sistema/campanias-landing` (permisos `CONTENIDO_DESTACADO_LANDING_*`), publicación transaccional con **una sola PUBLICADA** (índice único parcial), **vigencia derivada** (no persistida, zona `America/Guayaquil`) y caché por **ETag + Cache-Control** que se invalida solo al cambiar el contenido. La landing nunca se rompe si el endpoint público falla.
- **Fuente única del rastreo público**: el backend compone nombres, códigos, leyendas, visibilidad, orden (`ordenTracking` + `afterEstado`), flujo, cuenta regresiva y modalidad. `TrackingExampleService` genera ejemplos sintéticos desde ese catálogo/configuración y el frontend no mantiene una secuencia paralela de estados.
- **Aplicación central de estados configurados por punto (sin degradar)** (regla global): los hitos automáticos del flujo (asociar a consolidado, cierre/manifestado, enviado desde USA, arribo/arribado a Ecuador, **llegada a bodega del lote de recepción**, en despacho, avance masivo, entrega confirmada por el cliente) aplican su estado mediante la operación central `PaqueteService.aplicarEstadoEnConjunto`, que **clasifica cada paquete** (`clasificarParaEstadoDePunto` → `ACTUALIZABLE`/`MISMO_ESTADO`/`POSTERIOR`/`ALTERNO`/`BLOQUEADO`/`DESTINO_INACTIVO`) y **solo avanza los anteriores al hito**: nunca degrada posteriores ni terminales, no arrastra paquetes en flujo alterno ni bloqueados, no reaplica el mismo estado (idempotente: repetir no duplica avances) y **no depende del peso**. El estado destino se resuelve por configuración (`estado_rastreo`/`parametro_sistema`) comparando el **orden efectivo** del catálogo (no solo IDs); un hito con estado inactivo o ausente es un no-op. Devuelve `ResultadoEstadoPorPunto` (avanzados/omitidos por categoría) para informar en la UI (p. ej. el resumen del alta de lote de recepción). **No** pasan por esta operación: la secuencia de avance de consolidados (`aplicarEstadoSecuenciaConsolidados`, con preview-token e idempotencia determinista) y `aplicarEstadoAsociarGuiaMasterSiCorresponde` (ruta de una sola pieza que solo evita reaplicar el mismo estado); ambas quedan auditadas como rutas propias. **Reparación de históricos**: la misma clasificación la reutiliza la herramienta administrativa `ReparacionEstadoBodegaService` (`POST /api/operario/mantenimiento/reparacion-estado-bodega`, permiso `ESTADOS_RASTREO_UPDATE`) para auditar/reparar paquetes cuyo consolidado fue recibido en un lote pero no recibieron el estado de bodega: modos **DRY_RUN/EXECUTE** (con confirmación `EJECUTAR-REPARACION-BODEGA`), por **lotes con checkpoint** y `repairRunId`, con **fecha histórica** del lote (nunca la actual), evento **idempotente** `ESTADO_REPARADO_LOTE_RECEPCION` (clave estable `reparacion-bodega:<paqueteId>:<estadoId>`) que **no genera outbox ni notificaciones** (`TrackingEventService.registrarReparacionEstado`). Runbook: `docs/desarrollo/RUNBOOK_reparacion_estado_bodega.md`.
- **Métricas históricas ancladas en `event_type` semántico estable** (regla global): las métricas auditables sobre el event store (`paquete_estado_evento`) se anclan en el **`event_type`** semántico (p. ej. `ESTADO_APLICADO_DESPACHO` para "Paquetes/Peso despachados"), **no** en ids mutables del catálogo (`estado_rastreo`) ni en fechas de entidad editables/nullables (`despacho.fecha_hora`). El evento se emite en el punto transaccional real (idempotente, una vez por paquete para la métrica). Los huecos históricos se rellenan con migraciones de **backfill versionadas e idempotentes**, con fecha fiable y eventos identificables (`event_source`/`metadata_json`/`idempotency_key`); nunca con la fecha de ejecución de la migración. La disponibilidad se expone explícitamente (COMPLETA/PARCIAL/SIN_CONFIGURACION/SIN_HISTORIAL/NO_CALCULABLE) en vez de devolver 0 como sustituto de "sin datos".

### Contratos API y errores

- Prefijo backend: `/api`; el frontend resuelve la base mediante `resolve-api-base-url.ts`.
- Contratos principales: DTOs Java, tipos/esquemas TypeScript, controllers y `docs/desarrollo/API_REFERENCE.md`.
- Error estándar: `ApiErrorResponse(timestamp, status, error, message, errors)`.
- `GlobalExceptionHandler` traduce validación y solicitudes inválidas a 400, autenticación a 401, autorización a 403, no encontrado a 404, conflictos/integridad/locking optimista a 409 y fallos no controlados a 500.
- El frontend adjunta `Authorization: Bearer` mediante middleware de `openapi-fetch` (`http-feedback.ts`); ante 401 limpia la sesión y redirige a `/login`.
- Errores de red y 5xx muestran mensajes globales con limitación de frecuencia.

### Autenticación y autorización

- Spring Security stateless, CSRF deshabilitado y CORS configurable.
- JWT validado por `JwtAuthenticationFilter`; emisión/validación en `JwtService`.
- Autorización granular con `@PreAuthorize` y códigos persistidos en `permiso`.
- Roles canónicos encontrados: `ADMIN`, `OPERARIO`, `CLIENTE`; la sesión por enlace usa el principal técnico `ACCESO_ENLACE`.
- El frontend concede visualmente acceso total a `ADMIN`; la decisión efectiva permanece en el backend.
- Existen enlaces de acceso persistentes o temporales, canjeados en `/api/auth/acceso-enlace`.
- Endpoints públicos confirmados incluyen autenticación seleccionada, salud, rastreo, configuración pública, calculadora y acceso por enlace; revisar `SecurityConfig.java` antes de cambiar exposición.

### Configuración y migraciones

- `application.properties` contiene valores comunes y activa `dev` por defecto si no se define perfil.
- `application-dev.properties` configura desarrollo, seed repetible y reparación Flyway previa mediante `DevFlywayConfig`.
- `application-prod.properties` exige configuración de entorno y deshabilita OpenAPI/Scalar.
- Hibernate usa `ddl-auto=validate`; Flyway es la autoridad del esquema.
- No modificar migraciones históricas aplicadas. Los cambios futuros de esquema requieren una migración nueva.
- Zona horaria operativa: `America/Guayaquil`, fijada en aplicación y contenedor backend.
- **Familia de migraciones de reconciliación de estados históricos** (`V118`, `V119`, `V120`): reparan estados rezagados de paquetes/consolidados/guías contra el piso operativo derivado de sus relaciones y la configuración de "estados por punto" en `parametro_sistema` (sin hardcodear IDs; abortan si falta configuración; nunca degradan; omiten alterno/bloqueado/en revisión/terminal; fechas históricas verificables; eventos idempotentes sin notificar). `V120` añade la regla determinística Regla 4 (consolidado en liquidación por debajo de `LIQUIDADO` → `LIQUIDADO`). Detalle y matriz: `docs/ai/MODULE_MAP.md` §7, `docs/ai/states_audit.md`, `docs/ai/reparacion_reporte_v119.md`. **Flyway se ejecuta automáticamente al arrancar el backend en cualquier perfil** (`spring.flyway.enabled=true` en `application.properties`, sin guardia de entorno): el próximo arranque del backend aplica estas migraciones a la base de datos de ese entorno.

### Validación reciente (2026-06-20, corte `d81b513`)

- **Verificado en Git**: 34 tests de servicio de reconciliación verdes (`ReparacionEstadoBodegaServiceTest`, `PaqueteServiceReparacionBodegaTest`, `PaqueteServiceCalcularEstadoMinimoTest`, `TrackingEventServiceReparacionTest`, `EstadoConsolidadoOperativoResolverTest`).
- **Verificado en DB de dev**: `V120` ejecutada en `BEGIN…ROLLBACK` con `psql` (no aplicada de forma permanente): corrigió 1 paquete (`LLEGA_A_ADUANA→EN_BODEGA`) y 1 guía (`ENVIO_PARCIAL→RECEPCION_PARCIAL`), `post_*`=0, sin degradación, segunda corrida = 0 filas.
- **Pendiente de confirmar**: comportamiento de la familia de reconciliación contra datos de **producción** (la configuración de `estado_rastreo` puede diferir de dev; en dev `aduana` y `bodega` apuntan al mismo estado). No existe reporte de ejecución en producción; no afirmar que producción fue reparada.
- El grueso de la suite es unitario (Mockito) y el test de contexto legado está gateado por `ECUBOX_RUN_BOOT_CONTEXT_TEST`. Desde el MVP 1/8 existe un arnés de **integración con Testcontainers** (`AbstractPostgresIntegrationTest` + `MigracionesContextoIntegrationTest`) que aplica las migraciones de producción (`db/migration`) contra un PostgreSQL 18 real y valida arranque + esquema; requiere Docker (disponible en CI). Validar una migración aislada antes de promoverla sigue siendo más rápido con `psql` en `BEGIN…ROLLBACK` contra un clon de dev.

### Integraciones externas confirmadas

- PostgreSQL.
- Railway como destino documentado/configurado.
- Google Fonts (`fonts.googleapis.com`/`fonts.gstatic.com`) para Sora.
- Web Push con VAPID, desactivable por configuración.
- WhatsApp mediante enlaces `wa.me` y generación de mensajes operativos; no se encontró API de WhatsApp confirmada.
- Couriers de entrega son dominio interno; no se encontró API externa de courier confirmada.
- Generación local de PDF/XLSX; no se confirmó un servicio externo de archivos.
- No se encontró uso de `document.cookie`, analítica ni cookies publicitarias en el código revisado; sí existen `localStorage`, `sessionStorage` y caché PWA.

## 5. Comandos confirmados

Ejecutar desde la ruta indicada. No se documentan comandos no presentes en scripts, manifiestos o documentación ejecutable.

| Acción | Comando | Ruta/evidencia |
|---|---|---|
| Instalar frontend reproduciblemente | `npm ci` | `ecubox-frontend/package.json`, CI y Dockerfile |
| Desarrollo frontend | `npm run dev` | `ecubox-frontend/package.json` |
| Build + typecheck frontend | `npm run build` | Ejecuta `tsc -b`, worker TS, recursos y `vite build` |
| Preview frontend | `npm run preview` | `ecubox-frontend/package.json` |
| Tests frontend | `npm test` | Vitest en modo run |
| Tests frontend en watch | `npm run test:watch` | `ecubox-frontend/package.json` |
| Cobertura frontend | `npm run test:coverage` | `ecubox-frontend/package.json` |
| Lint de nomenclatura | `npm run lint:nomenclatura` | Script local específico; no existe lint general confirmado |
| Generar tipos OpenAPI | `npm run api:generate` | `scripts/generate-openapi-types.mjs`; lee `OPENAPI_URL`/`OPENAPI_INPUT` (default `http://localhost:8080/v3/api-docs/all`); requiere backend en perfil `dev` o un schema exportado |
| Desarrollo backend | `./mvnw spring-boot:run` | `README.md`, Maven Wrapper |
| Tests backend | `./mvnw test` | `pom.xml`, CI |
| Empaquetar backend | `./mvnw package` | Maven/Dockerfile |
| Migrar con plugin Maven | `./mvnw flyway:migrate` | Plugin Flyway en `pom.xml`; requiere `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD` |
| Health (Actuator, público) | `curl localhost:8080/actuator/health` | Sondas en `/actuator/health/{liveness,readiness}`; `/api/health` legacy sigue activo |
| Métricas (Actuator, autenticado) | `curl -H "Authorization: Bearer <jwt>" localhost:8080/actuator/metrics` | Solo expuesto si está en `MANAGEMENT_ENDPOINTS_WEB_EXPOSURE_INCLUDE` |
| Stack local | `docker compose up --build` | `README.md`, `docker-compose.yml` |
| Generar iconos | `npm run icons:generate` | `ecubox-frontend/package.json` |
| Exportar OpenAPI en Windows | `powershell -ExecutionPolicy Bypass -File scripts/export-openapi.ps1` | Script existente; requiere backend accesible |

No existe script independiente `typecheck`; el typecheck forma parte de `npm run build`. No existe script general `lint`.

## 6. Infraestructura y CI/CD

- Docker Compose levanta `db`, `backend` y `frontend`; publica 8080 y 80.
- Backend: build multi-stage Temurin JDK/JRE 25; ejecuta perfil `prod` como usuario no root.
- Frontend: build Node 22 y runtime Caddy 2 con fallback SPA, compresión y políticas de caché.
- Railway usa Dockerfile; backend tiene healthcheck `/api/health`.
- CI se ejecuta en pull requests y en pushes a `main`/`master`, no explícitamente en pushes a `dev`.
- No se encontró workflow de despliegue automático.

Variables por nombre, sin valores:

- Base de datos: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
- Perfil/runtime: `SPRING_PROFILES_ACTIVE`, `PORT`, `TZ`.
- JWT: `JWT_SECRET`, `JWT_EXPIRATION`, `JWT_ISSUER`.
- CORS/frontend: `CORS_ALLOWED_ORIGINS`, `VITE_API_URL`, `VITE_PUBLIC_SITE_URL`.
- Bootstrap: `ADMIN_BOOTSTRAP_ENABLED`, `ADMIN_USERNAME`, `ADMIN_EMAIL`, `ADMIN_INITIAL_PASSWORD`.
- Tracking/rate limit: `TRACKING_*`, `AUTH_RATELIMIT_*`, `TRUST_FORWARDED_HEADERS`.
- Hibernate: `HIBERNATE_JDBC_BATCH_SIZE`, `HIBERNATE_BATCH_FETCH_SIZE`.
- Web Push: `WEB_PUSH_ENABLED`, `WEB_PUSH_SUBJECT`, `WEB_PUSH_PUBLIC_KEY`, `WEB_PUSH_PRIVATE_KEY`, `WEB_PUSH_TTL_SECONDS`.

## 7. Fuentes canónicas

1. `ecubox-backend/src/main/java/`
2. `ecubox-backend/src/main/resources/application*.properties`
3. `ecubox-backend/src/main/resources/db/migration/`
4. `ecubox-backend/pom.xml`
5. `ecubox-frontend/src/routes/router.tsx`
6. `ecubox-frontend/src/app/navigation/dashboardNav.ts`
7. `ecubox-frontend/src/lib/api/`
8. `ecubox-frontend/src/types/` y `src/lib/schemas/`
9. `ecubox-frontend/package.json` y `package-lock.json`
10. Tests bajo ambos `src/test`/`*.test.*`
11. `.github/workflows/ci.yml`, Dockerfiles y `docker-compose.yml`
12. `docs/nomenclatura.md`, mientras concuerde con código y migraciones
13. `docs/desarrollo/API_REFERENCE.md` y documentación restante, tras cotejo

## 8. Reglas críticas y pendientes

- Trabajar contra `dev` para preguntas y cambios dependientes del código.
- No exponer secretos ni copiar valores de archivos `.env`.
- No cambiar contratos, permisos, tablas ni nombres canónicos sin revisar todas las capas.
- No editar migraciones históricas.
- Mantener sincronizados estos cuatro archivos después de cada implementación.
- **Proyecciones por audiencia**: las vistas de cliente no reutilizan el DTO administrativo. Exponen un DTO propio (`MiGuia*`, `MiDespacho*`) acotado al cliente o al scope de enlace —conteos, peso y estados se calculan solo sobre sus paquetes, nunca con totales globales— y omiten datos operativos sensibles (precinto, sacas, observaciones internas, liquidación, usuario creador). Cuando un dato tiene snapshot histórico (SCD2), la vista de cliente lo resuelve por la **misma fuente histórica** que el back-office (p. ej. el destino del despacho en `/mis-entregas`). El vocabulario visible se separa del interno (ver NAMING: estados de guía, entregas/despachos).
- Las revisiones administrativas que suspenden operabilidad se modelan como historial independiente del estado logístico; la condición activa se protege en servicio, base de datos y validadores operativos.
- Una bandeja de trabajo separa consulta global, operación normal y atención especializada; filtros, conteos y paginación se resuelven en servidor. Cuando una pantalla tiene varias bandejas, cada una es una consulta distinta (la bandeja forma parte de la queryKey) y **no se conservan datos entre bandejas distintas**: al cambiar de bandeja se muestra esqueleto, no filas de la anterior, y se limpian selección masiva, acción elegida, página y filtros no aplicables (referencia: `/paquetes`, `/guias-master`).
- `docs/desarrollo/TECH-STACK.md` está **alineado** con los manifiestos en las versiones mayores (Java 25, Spring Boot 4.0.7, React 19, Vite 8, TypeScript 6, Tailwind 4, jjwt 0.13.0, Zustand 5). Inconsistencia menor interna: declara Flyway `12.2.0` en una tabla y `12.6` en el resumen; `pom.xml` es la autoridad.
- **Contradicción (vigente)**: `docs/desarrollo/ARQUITECTURA_BACKEND.md` menciona `entity/enums` (los enums viven en `enums/` de nivel superior), `PermissionConstants`, `AuthService` y `PaqueteMapper`, que no existen en el árbol actual (el mapeo de paquete es inline; auth vive en `AuthController` + `UsuarioService`/`JwtService`).
- **Contradicción**: `docs/nomenclatura.md` mapea algunos endpoints como `/api/consignatarios`, `/api/lotes-recepcion`, `/api/despachos` y `/api/casillero`; el código actual expone variantes como `/api/mis-consignatarios`, `/api/operario/consignatarios`, `/api/operario/lotes-recepcion`, `/api/operario/despachos`, y el casillero se obtiene por configuración.
- **Pendiente de confirmar**: rama exacta conectada a cada servicio Railway.
- **Pendiente de confirmar**: OTEL activo en el entorno real de Railway/producción. La evidencia versionada solo confirma soporte opt-in: `ecubox-backend/Dockerfile` deja `OTEL_AGENT_VERSION` vacío por defecto, `ecubox-backend/railway.json` arranca con `java -Dspring.profiles.active=prod -jar app.jar` sin `JAVA_TOOL_OPTIONS`, y `docker-compose.yml` no define variables `OTEL_*`. En la auditoría local no había CLI/herramienta Railway disponible para leer variables reales del servicio.
- **Pendiente de confirmar**: cobertura mínima exigida; no hay umbral configurado.
- **Pendiente de confirmar**: estrategia E2E; no se encontraron Playwright/Cypress ni tests E2E.
- **MVP 3/8 (hecho)**: `src/lib/api/generated/schema.d.ts` se regeneró desde el contrato real (`docs/openapi/openapi.json`, OpenAPI 3.1, 172 rutas). Migrados a `openapi-fetch` los servicios públicos/auth/config: `auth`, `acceso-enlaces`, `campania-landing`, `tarifa-calculadora`, `parametros-sistema`.
- **MVP 4/8 (hecho)**: migrados los servicios operativos `paquetes`, `guias-master`, `envios-consolidados` (incl. descargas `manifiesto.pdf/.xlsx` vía `parseAs:'blob'`), `lotes-recepcion`, `estados-rastreo`, `consignatarios` (ya no importan Axios). Añadido `querySerializer` global comma-style (`form`/`explode:false`) en los clientes openapi-fetch para multivalor `List<...>` (p. ej. `estado=a,b`).
- **Ruta problemática (MVP 4)**: `listarGuiasMaster` (GET `/api/guias-master` no paginado) enviaba históricamente el query param `estados` (plural), pero el backend lo nombra `estado` (`@RequestParam(name="estado")`), por lo que el filtro se ignoraba. Se preservó el request EXACTO (sin cambiar comportamiento); **corregir el nombre a `estado` es un cambio funcional pendiente** (validar impacto en listados).
- **MVP 5/8 (hecho)**: migrados a `openapi-fetch` los servicios restantes (despacho/liquidación/reportes/admin): `operario-despachos`, `mis-despachos`, `manifiestos`, `liquidacion` (incl. descargas `exportar/pdf|xlsx` vía `parseAs:'blob'`), `estadisticas`, `notificaciones`, `web-push`, `mis-guias`, `couriers-entrega`, `puntos-entrega`, `agencias`, `usuario`, `rol`, `permiso`, `config-tarifa-distribucion`.
- **MVP 6/8 (hecho)**: **Axios eliminado por completo** — borrados `src/lib/api/client.ts` y `src/lib/api/endpoints.ts` (`API_ENDPOINTS` ya no se usaba; los servicios usan rutas literales del contrato); `error-message.ts` desacoplado de `AxiosError` (tipo estructural); `axios` retirado de `package.json` y lockfile. Activado **`noUncheckedIndexedAccess`** (110 errores corregidos en ~30 archivos, sin `any`).
- **Ruta problemática (MVP 5)**: `actualizarMiGuiaConsignatario` (en `mis-guias.service.ts`) apunta a `PUT /api/mis-guias/{id}/consignatario`, endpoint **inexistente** en el backend (solo existe `/{id}/destinatario`) → devuelve 404. Es **código muerto** (sin uso en UI). Se preservó el request exacto (cast de ruta) sin cambiar comportamiento; **corregir (repuntar a `/destinatario` o eliminar) es un cambio aparte**.
- **Pendiente (MVP ≥7)**: `tracking.service.ts` sigue en `fetch` crudo (nunca usó Axios; diferido por UX bespoke 404/429 con `Retry-After` y test que mockea `fetch`). Es el único servicio fuera de `openapi-fetch`.
- **Deuda de contrato (backend)**: springdoc emite respuestas con media type `*/*` y schemas laxos (propiedades opcionales, sin `null`, enums como `string`). Por eso los servicios migrados conservan los tipos de dominio manuales en sus firmas y usan casts localizados en el límite. Mejorar las anotaciones `@Schema`/`@ApiResponse` en backend permitiría eliminar esos casts (otro MVP).
- **Hallazgo arquitectónico (MVP 8/8, Modulith)**: el backend está organizado **por capa técnica** (`controller`, `service`, `repository`, `entity`, …), no por dominio. Spring Modulith detecta esas 14 capas como "módulos" y reporta ciclos entre ellas (`config↔service`, `config↔security↔service`, `projection↔repository`), esperados para un layout por capas. **No es enforcement**: el test reporta sin fallar. Para modularidad por dominio real haría falta reorganizar a paquetes por dominio (refactor grande, fuera de alcance). Detalle en [MODULITH_AUDITORIA.md](../desarrollo/MODULITH_AUDITORIA.md).
- **Pendiente (TS estricto)**: `exactOptionalPropertyTypes` queda **aplazado**. Medido en MVP 6/8: ~266 errores en ~83 archivos (props de componentes Radix/shadcn, hooks y objetos de query de servicios que pasan `{ x: undefined }` a `{ x?: T }`). Es un refactor amplio y de mayor riesgo (omitir claves vs. pasar `undefined` puede alterar runtime); se difiere a una iteración dedicada.
