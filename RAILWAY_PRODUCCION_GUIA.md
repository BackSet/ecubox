# Despliegue ECUBOX en Railway (produccion)

Este proyecto se despliega como 2 servicios separados:

- `backend`: Spring Boot (`ecubox-backend`)
- `frontend`: SPA React + Vite (`ecubox-frontend`) servida por Caddy

## 1) Servicio backend (Railway)

1. Crear servicio desde el repo, usando la raiz del proyecto.
2. Railway detecta `railway.json` de la raiz y ejecuta:
   - Build: `mvn -f ecubox-backend/pom.xml -DskipTests clean package`
   - Start: `java -Dspring.profiles.active=prod -jar ecubox-backend/target/*.jar`
3. Confirmar healthcheck en `/api/health`.

### Variables requeridas backend

- `SPRING_PROFILES_ACTIVE=prod`
- `DB_URL=jdbc:postgresql://<host>:<port>/<db>?sslmode=require`
- `DB_USERNAME=<usuario>`
- `DB_PASSWORD=<password>`
- `JWT_SECRET=<secreto_largo_32+>`
- `JWT_EXPIRATION=86400000`
- `CORS_ALLOWED_ORIGINS=https://<frontend>.up.railway.app`

Opcionales de bootstrap inicial (solo primer arranque):

- `ADMIN_BOOTSTRAP_ENABLED=true`
- `ADMIN_USERNAME=admin`
- `ADMIN_INITIAL_PASSWORD=<temporal_fuerte>`

## 2) Servicio frontend (Railway)

1. Crear segundo servicio apuntando al mismo repo.
2. Configurar `Root Directory` en `ecubox-frontend`.
3. Railway usa `ecubox-frontend/railway.json` y `ecubox-frontend/nixpacks.toml`:
   - Build: `npm ci && npm run build`
   - Start: `caddy run --config Caddyfile --adapter caddyfile`
4. El `Caddyfile` sirve `dist` con fallback SPA a `index.html`.

### Variables requeridas frontend

- `VITE_API_URL=https://<backend>.up.railway.app`

## 3) Enlace de dominios (frontend <-> backend)

1. Desplegar backend y copiar su dominio publico Railway.
2. Configurar `VITE_API_URL` del frontend con ese dominio.
3. Desplegar frontend y copiar su dominio publico Railway.
4. Configurar `CORS_ALLOWED_ORIGINS` del backend con el dominio frontend.
5. Redeploy de backend para aplicar CORS.

Si se usan dominios custom, reemplazar ambos valores por los dominios finales HTTPS.

## 4) Verificacion operativa

Checklist rapido:

- Backend responde `200` en `GET /api/health`.
- Frontend carga rutas directas (F5) sin `404`.
- Login/consumo API funciona desde frontend productivo.
- En backend no hay secretos hardcodeados en archivos versionados.
- CORS permite solo el/los dominio(s) frontend esperados.

## 5) Limpieza aplicada al repo

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
