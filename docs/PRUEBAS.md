# Pruebas automatizadas (ECUBOX)

Guía para ejecutar y ampliar tests del **backend** (Java / Spring Boot) y del **frontend** (React / Vite).

---

## Resumen

| Capa | Herramienta | Comando |
|------|--------------|---------|
| Backend | JUnit 5, Mockito, AssertJ, Spring Test (`MockMvc`, `@SpringBootTest` opcional) | `mvn test` desde `ecubox-backend/` |
| Frontend | Vitest, Testing Library, jsdom | `npm run test` desde `ecubox-frontend/` |

---

## Backend (`ecubox-backend`)

### Requisitos

- **JDK 25** (alineado con el `pom.xml`).
- **Maven** (wrapper incluido: `mvnw` / `mvnw.cmd`).

La mayoría de los tests son **unitarios** o de **slice** (p. ej. `MockMvc` standalone sin levantar PostgreSQL).

### Ejecutar

```bash
cd ecubox-backend
./mvnw test          # Linux / macOS
.\mvnw.cmd test      # Windows
```

### Test de contexto Spring (`EcuboxSistemaDeGestionApplicationTests`)

Ese test arranca la aplicación completa (**Flyway + PostgreSQL**). Si la base no está disponible o las credenciales no coinciden, el arranque falla.

Por defecto el test está **condicionado** a la variable de entorno:

```bash
# Linux / macOS — con PostgreSQL ya configurado en .env o variables equivalentes
export ECUBOX_RUN_BOOT_CONTEXT_TEST=true
./mvnw test
```

```powershell
# Windows (PowerShell)
$env:ECUBOX_RUN_BOOT_CONTEXT_TEST = "true"
.\mvnw.cmd test
```

Sin esa variable, el test se **omite** y el resto de la suite puede pasar en máquinas sin BD.

### Pruebas de integración con PostgreSQL real (Testcontainers)

Para validar el **arranque del contexto** y la **cadena de migraciones Flyway** contra un motor real (NO H2), el backend incluye pruebas de integración basadas en **Testcontainers**:

- Base común: `src/test/java/.../integration/AbstractPostgresIntegrationTest.java` — levanta un contenedor **PostgreSQL 18** (`postgres:18-alpine`, alineado con dev/prod), inyecta el datasource vía `@DynamicPropertySource` y activa el perfil `test`.
- Perfil `test`: `src/test/resources/application-test.properties` — Flyway aplica **solo las migraciones de producción** (`classpath:db/migration`, sin los seeds solo-dev de `db/dev`) y Hibernate corre con `ddl-auto=validate`. No contiene credenciales reales (el secreto JWT es un valor exclusivo de test).
- Prueba inicial: `MigracionesContextoIntegrationTest` — verifica que el contexto arranca, que Flyway aplicó las migraciones versionadas, que existen las tablas núcleo del dominio y que los catálogos sembrados por migraciones (roles, permisos, estados de rastreo) se mapean correctamente con JPA.

**Requisito:** estas pruebas necesitan **Docker** (o un runtime compatible) en la máquina. Donde Docker no esté disponible fallarán al arrancar el contenedor; el job de CI (`ubuntu-latest`) sí dispone de Docker y las ejecuta como parte de `./mvnw test`.

```bash
# Ejecutar solo las pruebas de integración (requiere Docker en marcha)
cd ecubox-backend
./mvnw test -Dtest='*IntegrationTest'

# Ejecutar la suite excluyendo integración (máquinas sin Docker)
./mvnw test '-Dtest=!*IntegrationTest'
```

### Convenciones

- Clases de test: `*Test.java` bajo `src/test/java`, mismo paquete lógico que el código bajo prueba.
- Servicios con dependencias: `@ExtendWith(MockitoExtension.class)` y mocks manuales (ver `CodigoSecuenciaServiceTest`).
- Controladores HTTP sin contexto: `MockMvcBuilders.standaloneSetup(...)` (ver `TrackingControllerCacheTest`).

### Informes Surefire

Tras `mvn test`, los resultados XML/HTML quedan en:

`ecubox-backend/target/surefire-reports/`

### Ampliar cobertura

1. Priorizar lógica de dominio y validaciones (`jakarta.validation`) sin Spring.
2. Añadir pruebas de contrato HTTP con `MockMvc` cuando el flujo lo merezca.
3. Para integración real con BD usar la base **Testcontainers** + perfil `test` ya disponible (`AbstractPostgresIntegrationTest`); extender con pruebas de repositorio/servicio de alto valor sobre PostgreSQL real cuando el riesgo lo justifique.

---

## Frontend (`ecubox-frontend`)

### Requisitos

- **Node.js 22** (LTS recomendado en el README del monorepo).

### Instalación

```bash
cd ecubox-frontend
npm install
```

### Comandos

| Script | Descripción |
|--------|-------------|
| `npm run test` | Una pasada (`vitest run`). |
| `npm run test:watch` | Modo observación durante el desarrollo. |
| `npm run test:coverage` | Igual que `test` con informe de cobertura V8 (`coverage/`). |

### Ubicación y nombres

- Archivos colocados junto al código: `*.test.ts` o `*.test.tsx` dentro de `src/`.
- Alias de importación **`@/`** → `src/`, igual que en Vite (configurado en `vitest.config.ts`).

### Setup global

- `src/test/setup.ts` — matchers de `@testing-library/jest-dom` para Vitest.

### Tipos de prueba

1. **Unitarias puras** (sin DOM): p. ej. `resolve-api-base-url.test.ts`, esquemas Zod en `validation.test.ts`.
2. **Componentes (RTL)**: renderizado y comportamiento accesible mínimo, p. ej. `StatusBadge.test.tsx`.

### Mocks de red

Las llamadas HTTP reales no se mockean aún de forma global. Para pruebas de integración con API, una opción habitual es **MSW (Mock Service Worker)**; se puede documentar y añadir en una iteración posterior.

### Build de producción

El pipeline de build (`npm run build`) usa **TypeScript** + **Vite** y no ejecuta Vitest por defecto. Los tests se lanzan en CI o manualmente con `npm run test`.

---

## Integración continua

El workflow [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) ejecuta:

1. Tests del backend con JDK 25.
2. Instalación reproducible del frontend mediante `npm ci`.
3. Tests Vitest.
4. Build de producción.

Las pruebas de integración con **Testcontainers** (`*IntegrationTest`) se ejecutan como parte de `./mvnw -B test` en el job de backend: `ubuntu-latest` provee Docker, por lo que el contenedor PostgreSQL se levanta automáticamente sin configuración adicional.

El test de contexto Spring legado (`EcuboxSistemaDeGestionApplicationTests`) solo se ejecutará si el job exporta `ECUBOX_RUN_BOOT_CONTEXT_TEST=true` **y** proporciona PostgreSQL; la cobertura de arranque + migraciones queda cubierta por las pruebas Testcontainers.

---

## Referencias en el código

| Área | Ejemplos |
|------|----------|
| Backend Mockito | `src/test/java/.../service/CodigoSecuenciaServiceTest.java` |
| Backend MockMvc | `src/test/java/.../controller/TrackingControllerCacheTest.java` |
| Frontend Vitest | `src/lib/api/resolve-api-base-url.test.ts`, `src/components/ui/StatusBadge.test.tsx` |

---

*Última revisión: al introducir Vitest y la suite inicial documentada en este archivo.*
