# Contexto técnico canónico de ECUBOX

> Corte funcional auditado: rama `dev`, merge `6ff2e24d5620305dc4315c2437a08b2f49f6d0fb`.
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
| Migraciones | `ecubox-backend/src/main/resources/db/migration/` | Flyway `V1` a `V110`, con numeración no necesariamente contigua. |
| Seed de desarrollo | `ecubox-backend/src/main/resources/db/dev/` | Migración repetible solo del perfil `dev`. |
| Tests backend | `ecubox-backend/src/test/java/` | JUnit/Spring Test/Mockito; predominan unitarios y pruebas HTTP aisladas. |
| Tests frontend | `ecubox-frontend/src/**/*.test.{ts,tsx}` | Vitest, Testing Library y jsdom. |
| CI | `.github/workflows/ci.yml` | Tests backend, instalación/test/build frontend. |

## 3. Stack confirmado

### Backend

- Java 25 y Spring Boot 4.0.6.
- Maven Wrapper; manifiesto `ecubox-backend/pom.xml`.
- Spring MVC, Security, Data JPA, Validation y Flyway.
- PostgreSQL; imagen local `postgres:18-alpine`.
- Flyway 12.6.2 con módulo PostgreSQL.
- JWT con JJWT 0.13.0.
- OpenAPI/Scalar con Springdoc 3.0.3.
- Lombok 1.18.46 y MapStruct 1.6.3.
- Bucket4j 8.19.0, Micrometer, PDFBox 3.0.7, Apache POI 5.5.1 y Web Push 5.1.2.
- Tests mediante `spring-boot-starter-test` y Maven Surefire.

### Frontend

- React 19.2.6, TypeScript 6.0.3 y Vite 8.0.14.
- Node.js 22 en CI y Docker.
- npm con lockfile `ecubox-frontend/package-lock.json`.
- TanStack Router 1.170.8 y TanStack Query 5.100.14.
- Axios 1.16.1, Zustand 5.0.13, React Hook Form 7.76.1 y Zod 4.4.3.
- Tailwind CSS 4.3.0, Radix UI/shadcn, Lucide y Sonner.
- PWA con `vite-plugin-pwa`; generación de iconos con Sharp.
- Exportación con jsPDF, ExcelJS y `html-to-image`.
- Vitest 4.1.7, Testing Library, jsdom y cobertura V8.

Las versiones anteriores están **verificadas en Git** en `pom.xml`, `package.json` y lockfiles. `docs/desarrollo/TECH-STACK.md` contiene varias versiones anteriores y no debe usarse para fijar versiones sin cotejo.

## 4. Arquitectura

### Frontend

- `src/routes/router.tsx` declara rutas públicas y privadas con TanStack Router y carga diferida.
- `src/pages/` agrupa páginas por área funcional.
- `src/components/` contiene componentes compartidos y primitivos UI.
- `src/hooks/` encapsula consultas/mutaciones de TanStack Query y lógica reutilizable.
- `src/lib/api/` centraliza endpoints, cliente Axios y servicios por dominio.
- `src/types/` define contratos TypeScript; `src/lib/schemas/` contiene validación Zod.
- `src/stores/authStore.ts` y `themeStore.ts` manejan estado de cliente con Zustand.
- La autorización de navegación se comprueba con permisos antes de cargar rutas; esto mejora UX, pero el backend sigue siendo la autoridad de seguridad.
- **Sistema de diseño y movimiento**: `src/index.css` define tokens globales de color/radio y de **movimiento** (`--motion-fast|normal|slow|emphasis`, curvas `--motion-ease-standard|enter|exit|emphasized`) más utilidades semánticas (`.ui-transition`, `.ui-interactive`, `.ui-surface-hover`, `.ui-motion-*`). Todo respeta `prefers-reduced-motion`. La referencia operativa es `ecubox-frontend/UI_GUIDELINES.md`. Regla global: no `transition-all` ni duraciones/curvas literales dispersas.
- **Estándar responsive** (`UI_GUIDELINES.md` §5.5): viewports canónicos 320–1720 px; a 320 px ninguna página produce scroll horizontal. Regla global: hijos flex que truncan llevan `min-w-0`; controles `w-full max-w-full` en móvil con ancho limitado solo desde breakpoint; tablas desplazan su contenedor (`ListTableShell`/`.table-responsive`), no la página; popovers/dialogs acotados al viewport; prohibido ocultar overflow con `overflow-x-hidden` global. Controles compartidos `SelectTrigger`/`SelectContent`/`SearchableCombobox` endurecidos con `min-w-0`/`max-w` al viewport.

### Backend

- Flujo predominante: `Controller -> Service -> Repository -> PostgreSQL`.
- Los controllers trabajan con DTOs; los services concentran reglas y transacciones.
- Persistencia con entidades JPA y repositorios Spring Data.
- Mapeo mixto: MapStruct en `AgenciaMapper`, `CourierEntregaMapper`, `EstadoRastreoMapper`, `PermisoMapper` y `RolMapper`; otros servicios realizan mapeo directo.
- Búsquedas paginadas usan `PageResponse`, `Pageable`, Specifications y proyecciones según el módulo.
- Procesos programados y event-driven viven en `scheduler/`, `event/`, `projection/` y servicios de outbox/rastreo.
- **Fuente única del rastreo público**: el backend compone nombres, códigos, leyendas, visibilidad, orden (`ordenTracking` + `afterEstado`), flujo, cuenta regresiva y modalidad. `TrackingExampleService` genera ejemplos sintéticos desde ese catálogo/configuración y el frontend no mantiene una secuencia paralela de estados.

### Contratos API y errores

- Prefijo backend: `/api`; el frontend resuelve la base mediante `resolve-api-base-url.ts`.
- Contratos principales: DTOs Java, tipos/esquemas TypeScript, controllers y `docs/desarrollo/API_REFERENCE.md`.
- Error estándar: `ApiErrorResponse(timestamp, status, error, message, errors)`.
- `GlobalExceptionHandler` traduce validación y solicitudes inválidas a 400, autenticación a 401, autorización a 403, no encontrado a 404, conflictos/integridad/locking optimista a 409 y fallos no controlados a 500.
- El frontend adjunta `Authorization: Bearer` mediante interceptor Axios; ante 401 limpia la sesión y redirige a `/login`.
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

### Integraciones externas confirmadas

- PostgreSQL.
- Railway como destino documentado/configurado.
- Web Push con VAPID, desactivable por configuración.
- Couriers de entrega son dominio interno; no se encontró API externa de courier confirmada.
- Generación local de PDF/XLSX; no se confirmó un servicio externo de archivos.

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
| Desarrollo backend | `./mvnw spring-boot:run` | `README.md`, Maven Wrapper |
| Tests backend | `./mvnw test` | `pom.xml`, CI |
| Empaquetar backend | `./mvnw package` | Maven/Dockerfile |
| Migrar con plugin Maven | `./mvnw flyway:migrate` | Plugin Flyway en `pom.xml`; requiere `FLYWAY_URL`, `FLYWAY_USER`, `FLYWAY_PASSWORD` |
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
- Las revisiones administrativas que suspenden operabilidad se modelan como historial independiente del estado logístico; la condición activa se protege en servicio, base de datos y validadores operativos.
- Una bandeja de trabajo separa consulta global, operación normal y atención especializada; filtros, conteos y paginación se resuelven en servidor.
- **Contradicción**: `docs/desarrollo/TECH-STACK.md` tiene versiones antiguas frente a manifiestos.
- **Contradicción**: `docs/desarrollo/ARQUITECTURA_BACKEND.md` menciona `entity/enums`, `PermissionConstants`, `AuthService`, `PaqueteMapper` y entidades de tracking que no coinciden con el árbol actual.
- **Contradicción**: `docs/nomenclatura.md` mapea algunos endpoints como `/api/consignatarios`, `/api/lotes-recepcion`, `/api/despachos` y `/api/casillero`; el código actual expone variantes como `/api/mis-consignatarios`, `/api/operario/consignatarios`, `/api/operario/lotes-recepcion`, `/api/operario/despachos`, y el casillero se obtiene por configuración.
- **Pendiente de confirmar**: rama exacta conectada a cada servicio Railway.
- **Pendiente de confirmar**: cobertura mínima exigida; no hay umbral configurado.
- **Pendiente de confirmar**: estrategia E2E; no se encontraron Playwright/Cypress ni tests E2E.
