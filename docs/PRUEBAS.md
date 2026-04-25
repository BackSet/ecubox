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
3. Para integración real con BD, valorar **Testcontainers** + perfil `test` (no incluido aún); los comentarios en tests existentes pueden referenciar esa línea.

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

## Integración continua (sugerencia)

Si se añade un workflow (GitHub Actions, etc.), un job mínimo puede ser:

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '25'
      - name: Backend tests
        run: cd ecubox-backend && ./mvnw -B test
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - name: Frontend tests
        run: cd ecubox-frontend && npm ci && npm run test
```

El test de contexto Spring solo se ejecutará si el job exporta `ECUBOX_RUN_BOOT_CONTEXT_TEST=true` **y** proporciona PostgreSQL (servicio Docker o similar).

---

## Referencias en el código

| Área | Ejemplos |
|------|----------|
| Backend Mockito | `src/test/java/.../service/CodigoSecuenciaServiceTest.java` |
| Backend MockMvc | `src/test/java/.../controller/TrackingControllerCacheTest.java` |
| Frontend Vitest | `src/lib/api/resolve-api-base-url.test.ts`, `src/components/ui/StatusBadge.test.tsx` |

---

*Última revisión: al introducir Vitest y la suite inicial documentada en este archivo.*
