# Variables de entorno ECUBOX

**Todos los valores de la tabla y los bloques de código son tentativos y ficticios:** sirven solo para ilustrar el formato. No representan servicios, hosts ni credenciales reales. En producción debes generar URLs y secretos propios.

Para plantillas mínimas, usa `ecubox-backend/.env.example` y `ecubox-frontend/.env.example`.

---

## Backend (`ecubox-backend/.env`)

Cargado automáticamente al arrancar Spring Boot desde el directorio de trabajo del backend.

| Variable | Requerida | Descripción | Ejemplo tentativo (local) | Ejemplo tentativo (Docker Compose, raíz del repo) | Ejemplo tentativo (producción / PaaS) |
|----------|-----------|-------------|---------------------------|---------------------------------------------------|-------------------------------------|
| `SPRING_PROFILES_ACTIVE` | No | Perfil Spring (`dev`, `prod`). | `dev` | `prod` | `prod` |
| `DB_URL` | Sí | JDBC PostgreSQL. | `jdbc:postgresql://localhost:5432/nombre_bd_ejemplo` | `jdbc:postgresql://db:5432/nombre_bd_ejemplo` | `jdbc:postgresql://HOST_PROVEEDOR_EJEMPLO:5432/bd_ejemplo` |
| `DB_USERNAME` | Sí | Usuario de la base. | `usuario_ejemplo` | `usuario_ejemplo` | Valor que te dé tu proveedor de BD |
| `DB_PASSWORD` | Sí | Contraseña de la base. | `contraseña_ficticia_solo_documentación` | Igual que `DB_PASSWORD` en el `.env` de la raíz | Secreto definido en tu plataforma |
| `JWT_SECRET` | Sí | Firma HS256; **mínimo 32 caracteres**. | `cadena_ficticia_minimo_32_caracteres_xx` | Secreto del `.env` raíz (≥32 caracteres) | Cadena aleatoria larga generada por ti |
| `JWT_EXPIRATION` | No | Validez del token en ms. | `86400000` | `86400000` | `86400000` |
| `CORS_ALLOWED_ORIGINS` | No | Orígenes del navegador separados por coma. | `http://localhost:5173` | `http://localhost` | `https://origen-frontend-ejemplo.invalid` |
| `ADMIN_BOOTSTRAP_ENABLED` | No | Crear usuario admin en el primer arranque. | `true` | `true` o `false` | `false` tras el primer arranque |
| `ADMIN_USERNAME` | No | Nombre del admin inicial. | `usuario_admin_ejemplo` | `usuario_admin_ejemplo` | — |
| `ADMIN_EMAIL` | Condicional | Obligatorio si bootstrap está activo. | `correo-ejemplo@dominio-ficticio.invalid` | `correo-ejemplo@dominio-ficticio.invalid` | Un email real **tuyo** (no copies el de la tabla) |
| `ADMIN_INITIAL_PASSWORD` | Condicional | Contraseña del primer admin. | `ContraseñaFicticia123` | Variable inyectada en el despliegue | Secreto fuerte **generado por ti** |
| `TRACKING_TIMELINE_USE_EVENTS` | No | Línea de tiempo basada en eventos. Por defecto en [application.properties](../../ecubox-backend/src/main/resources/application.properties). | `true` | `true` | `true` |
| `TRACKING_OUTBOX_RELAY_DELAY_MS` | No | Retardo del relay de outbox (ms). | `5000` | `5000` | `5000` |
| `TRACKING_OUTBOX_MAX_ATTEMPTS` | No | Reintentos máximos outbox. | `6` | `6` | `6` |

---

## Frontend (`ecubox-frontend/.env`)

Vite **embebe** estas variables en el build: no pongas secretos (solo URLs públicas).

| Variable | Requerida | Descripción | Ejemplo tentativo (desarrollo) | Ejemplo tentativo (Compose) | Ejemplo tentativo (build de producción) |
|----------|-----------|-------------|-------------------------------|-------------------------------|----------------------------------------|
| `VITE_API_URL` | Sí | URL base de la API **incluyendo** `/api`. | `http://localhost:8080/api` | `http://localhost:8080/api` o la URL interna que use tu red | `https://api-backend-ejemplo.invalid/api` (sustituir por tu URL real) |

---

## Docker Compose (`.env` en la raíz del monorepo)

Compose exige al menos:

| Variable | Uso |
|----------|-----|
| `DB_PASSWORD` | Contraseña del servicio `db` y del backend. |
| `JWT_SECRET` | Mínimo 32 caracteres. |

**Ejemplo mínimo ficticio (solo forma; genera valores propios):**

```env
DB_PASSWORD=clave_bd_completamente_ficticia
JWT_SECRET=cadena_ficticia_de_al_menos_32_caracteres
```

---

## Enlaces relacionados

- [Guía Railway](RAILWAY_PRODUCCION_GUIA.md)
- [README del repositorio](../../README.md)
