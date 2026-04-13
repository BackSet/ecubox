# ECUBOX

Sistema de gestión logística para envíos internacionales USA — Ecuador. Gestiona paquetes, despachos, manifiestos, lotes de recepción y tracking en tiempo real.

## Arquitectura

Monorepo con dos servicios independientes y una base de datos PostgreSQL:

```
ECUBOX/
├── ecubox-backend/    # API REST — Java 25, Spring Boot 4.0.3
├── ecubox-frontend/   # SPA — React 19, Vite 8, TypeScript 6
├── docker-compose.yml # Orquestación local (backend + frontend + PostgreSQL)
├── docs/              # Documentación (usuario, desarrollo, despliegue, branding)
│   ├── README.md      # Índice
│   ├── usuario/
│   ├── desarrollo/
│   ├── despliegue/
│   └── branding/
└── README.md            # Inicio rápido del monorepo
```

## Prerequisitos

| Herramienta | Versión mínima | Notas |
|-------------|---------------|-------|
| Java (JDK) | 25 | Temurin recomendado |
| Node.js | 22 | LTS |
| PostgreSQL | 17 | O usar Docker |
| Docker + Compose | 27+ / v2 | Solo si se usa inicio con Docker |

## Inicio rápido con Docker

```bash
# 1. Crear .env en la raíz (valores de ejemplo; sustituir por secretos propios)
cat > .env <<EOF
DB_PASSWORD=definir_contraseña_ficticia_aqui
JWT_SECRET=definir_cadena_minimo_32_caracteres_ficticia
EOF

# 2. Levantar todo
docker compose up --build -d

# 3. Acceder
# Frontend: http://localhost
# API:      http://localhost:8080
# Swagger:  http://localhost:8080/swagger-ui.html (solo perfil dev)
```

## Inicio rápido manual

### Backend

```bash
cd ecubox-backend
cp .env.example .env          # Editar con tus valores
./mvnw spring-boot:run        # Linux/Mac
.\mvnw.cmd spring-boot:run    # Windows
```

El backend arranca en `http://localhost:8080` con perfil `dev` por defecto.

### Frontend

```bash
cd ecubox-frontend
cp .env.example .env          # Editar VITE_API_URL si es necesario
npm install
npm run dev
```

El frontend arranca en `http://localhost:5173`.

## Variables de entorno

### Backend (`ecubox-backend/.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `DB_URL` | Sí | URL JDBC de PostgreSQL |
| `DB_USERNAME` | Sí | Usuario de la base de datos |
| `DB_PASSWORD` | Sí | Contraseña de la base de datos |
| `JWT_SECRET` | Sí | Clave para firmar tokens JWT (mín. 32 caracteres) |
| `JWT_EXPIRATION` | No | Duración del token en ms (default: 86400000 = 24h) |
| `CORS_ALLOWED_ORIGINS` | No | Orígenes permitidos separados por coma |
| `ADMIN_BOOTSTRAP_ENABLED` | No | `true` para crear usuario admin en primer arranque |
| `ADMIN_USERNAME` | No | Username del admin inicial (default: `admin`) |
| `ADMIN_INITIAL_PASSWORD` | No | Contraseña del admin inicial |
| `ADMIN_EMAIL` | Si bootstrap activo | Email del usuario admin inicial |

### Frontend (`ecubox-frontend/.env`)

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_API_URL` | Sí | URL pública del backend con `/api` (sustituir por la tuya; ver ejemplos tentativos en la guía) |

Tablas ampliadas con **ejemplos** por entorno: [docs/despliegue/VARIABLES_ENTORNO.md](docs/despliegue/VARIABLES_ENTORNO.md).

## Documentación

Índice completo: [docs/README.md](docs/README.md).

| Área | Enlaces |
|------|---------|
| Usuario | [Manual de usuario](docs/usuario/MANUAL_USUARIO.md), [Guía de estados y seguimiento](docs/usuario/GUIA_ESTADOS_Y_SEGUIMIENTO.md) |
| Desarrollo | [API](docs/desarrollo/API_REFERENCE.md), [TECH-STACK](docs/desarrollo/TECH-STACK.md), [Arquitectura backend](docs/desarrollo/ARQUITECTURA_BACKEND.md), [UX/UI](docs/desarrollo/UX-UI-DESIGN.md) |
| Despliegue | [Variables de entorno](docs/despliegue/VARIABLES_ENTORNO.md), [Railway](docs/despliegue/RAILWAY_PRODUCCION_GUIA.md) |
| Branding | [docs/branding/ecubox-branding.html](docs/branding/ecubox-branding.html) |

### Nota de despliegue Railway

Cada servicio debe desplegarse con su propio `Root Directory` y su propia configuración:

- Backend: `Root Directory = ecubox-backend`, `Builder = Dockerfile`, `Dockerfile path = ecubox-backend/Dockerfile`
- Frontend: `Root Directory = ecubox-frontend`, `Builder = Dockerfile`, `Dockerfile path = ecubox-frontend/Dockerfile`

## Licencia

Proyecto privado. Todos los derechos reservados.
