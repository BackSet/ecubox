# Manual completo de despliegue ECUBOX en Railway (produccion)

Este manual deja ECUBOX corriendo en produccion con 2 servicios separados:

- `backend`: Spring Boot (`ecubox-backend`)
- `frontend`: SPA React + Vite (`ecubox-frontend`) servida con Caddy

## 1) Arquitectura de despliegue

- Un proyecto Railway con 3 componentes:
  - Servicio `backend` (API Java)
  - Servicio `frontend` (sitio React)
  - Base de datos PostgreSQL (plugin/servicio administrado)
- Flujo:
  - Navegador -> `frontend` (dominio Railway o custom)
  - Frontend -> `backend` usando `VITE_API_URL`
  - Backend -> PostgreSQL con `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`

## 2) Pre-requisitos

- Repositorio actualizado en GitHub (`main`).
- Cuenta Railway conectada al repo.
- Variables/secretos disponibles:
  - Credenciales DB
  - `JWT_SECRET` fuerte (recomendado 64+ caracteres aleatorios)
- Confirmar que existen estos archivos de despliegue:
  - `railway.json` (raiz, backend)
  - `nixpacks.toml` (raiz, backend)
  - `ecubox-frontend/railway.json`
  - `ecubox-frontend/nixpacks.toml`
  - `ecubox-frontend/Caddyfile`

## 3) Servicio backend (paso a paso)

1. En Railway: `New Project` -> `Deploy from GitHub Repo`.
2. Selecciona `BackSet/ecubox`.
3. Crea servicio `backend` usando la raiz del repo.
4. Railway tomara `railway.json` de raiz:
   - Build: `chmod +x ecubox-backend/mvnw && ./ecubox-backend/mvnw -f ecubox-backend/pom.xml -DskipTests clean package`
   - Start: `java -Dspring.profiles.active=prod -jar ecubox-backend/target/*.jar`
5. `nixpacks.toml` de raiz fuerza toolchain:
   - `maven`
   - `jdk25`
6. Espera a `Deployment successful`.
7. Prueba healthcheck:
   - `GET https://<backend-domain>/api/health`
   - Debe responder `200`.

## 4) Variables de entorno backend

Configura en Railway -> servicio backend -> `Variables`:

- `SPRING_PROFILES_ACTIVE=prod`
- `DB_URL=jdbc:postgresql://<host>:<port>/<db>?sslmode=require`
- `DB_USERNAME=<usuario_db>`
- `DB_PASSWORD=<password_db>`
- `JWT_SECRET=<secreto_fuerte>`
- `JWT_EXPIRATION=86400000`
- `CORS_ALLOWED_ORIGINS=https://<frontend-domain>`

Opcionales solo para bootstrap inicial:

- `ADMIN_BOOTSTRAP_ENABLED=true`
- `ADMIN_USERNAME=admin`
- `ADMIN_INITIAL_PASSWORD=<temporal_fuerte>`

Despues del primer arranque exitoso, recomendado:

- `ADMIN_BOOTSTRAP_ENABLED=false`

## 5) Servicio frontend (paso a paso)

1. En el mismo proyecto Railway, crea un segundo servicio.
2. Selecciona el mismo repo.
3. En settings del servicio, define `Root Directory = ecubox-frontend`.
4. Railway tomara:
   - `ecubox-frontend/railway.json`
   - `ecubox-frontend/nixpacks.toml`
   - `ecubox-frontend/Caddyfile`
5. Comandos efectivos:
   - Build: `npm ci && npm run build`
   - Start: `caddy run --config Caddyfile --adapter caddyfile`
6. Confirma deploy exitoso.

## 6) Variables de entorno frontend

Configura en Railway -> servicio frontend -> `Variables`:

- `VITE_API_URL=https://<backend-domain>`

Notas:

- Debe ser URL completa HTTPS del backend publicado.
- No colocar secretos en variables `VITE_*` (se embeben en build).

## 7) Orden correcto de enlace entre servicios

1. Despliega backend.
2. Copia dominio publico backend.
3. Configura `VITE_API_URL` en frontend con ese dominio.
4. Despliega frontend.
5. Copia dominio publico frontend.
6. Configura `CORS_ALLOWED_ORIGINS` en backend con ese dominio frontend.
7. Redeploy backend para aplicar CORS.

## 8) Dominios personalizados (opcional)

Si usas dominio propio:

1. Asigna dominio custom al frontend en Railway.
2. Asigna dominio/subdominio custom al backend.
3. Actualiza variables:
   - Frontend: `VITE_API_URL=https://api.tudominio.com`
   - Backend: `CORS_ALLOWED_ORIGINS=https://app.tudominio.com`
4. Redeploy de ambos servicios.
5. Verifica certificados TLS activos (Railway los gestiona automaticamente).

## 9) Checklist de verificacion productiva

- `GET /api/health` backend responde `200`.
- Frontend abre `/login`.
- Navegacion a dashboard sin errores de red.
- Ruta `/despachos/nuevo` carga correctamente.
- Refresh (F5) en rutas internas del frontend no da `404` (fallback SPA OK).
- No errores CORS en consola del navegador.
- No secretos hardcodeados en repo.

## 10) Troubleshooting rapido

### Error: `mvn: command not found`

- Confirmar que existe `nixpacks.toml` en raiz con:
  - `nixPkgs = ["maven", "jdk25"]`
- Confirmar build command con `./ecubox-backend/mvnw`.
- Ejecutar `Redeploy` con `Clear Build Cache`.

### Error CORS en frontend

- Revisar `CORS_ALLOWED_ORIGINS` en backend.
- Debe coincidir exactamente con dominio frontend (incluye `https://`).
- Redeploy backend tras cambiar variable.

### Frontend no consume backend

- Revisar `VITE_API_URL` en frontend.
- Debe apuntar a dominio backend valido.
- Redeploy frontend tras cambiar variable.

### Error 404 al refrescar rutas React

- Verificar que `Caddyfile` tenga:
  - `try_files {path} /index.html`

### Error de arranque backend por DB

- Revisar `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`.
- Confirmar conectividad y sslmode en cadena JDBC.

## 11) Operacion diaria (runbook)

- Despliegue normal:
  - push a `main` -> Railway autodeploy.
- Cambio de variables:
  - editar variable -> redeploy del servicio afectado.
- Rollback:
  - Railway -> Deployments -> seleccionar deploy anterior -> rollback/redeploy.
- Monitoreo:
  - revisar logs de backend/frontend tras cada deploy.
  - verificar `/api/health` despues de cada release.

## 12) Seguridad minima recomendada

- Rotar `JWT_SECRET` periodicamente.
- Usar contrasenas fuertes en DB y admin inicial.
- Desactivar bootstrap admin tras primer uso.
- Limitar `CORS_ALLOWED_ORIGINS` a dominios exactos (sin comodines).
- Mantener Swagger deshabilitado en prod (`springdoc.swagger-ui.enabled=false`).

## 13) Limpieza aplicada al repositorio

Se eliminaron artefactos regenerables y reportes no operativos:

- `ecubox-frontend/node_modules`
- `ecubox-frontend/dist`
- `ecubox-frontend/.agents`
- `ecubox-frontend/.astro`
- `ecubox-frontend/tsconfig.tsbuildinfo`
- `ecubox-backend/target`
- `TRACKING_EVENTDRIVEN_ROLLOUT_2026-03.md`
- `TRACKING_ORDEN_TESTS_2026-03.md`
- `TRACKING_STATE_AUDIT_2026-03.md`
- `UI_UX_AUDIT_2026-03.md`
- `UI_UX_BENCHMARK_2026-03.md`
- `UI_UX_VALIDACION_2026-03.md`
