# ECUBOX

Sistema de gestión logística para envíos entre Estados Unidos y Ecuador.
Incluye administración de paquetes, guías master, despachos, manifiestos,
liquidaciones, recepción, rastreo público y notificaciones PWA.

## Arquitectura

```text
ECUBOX/
├── ecubox-backend/     API REST con Java 25 y Spring Boot 4.0.6
├── ecubox-frontend/    SPA/PWA con React 19, TypeScript 6 y Vite 8
├── docs/               Documentación técnica, operativa y de despliegue
├── docker-compose.yml  PostgreSQL 18, backend y frontend
└── .github/workflows/  Integración continua
```

## Requisitos

| Herramienta | Versión |
|-------------|---------|
| Java | 25 |
| Node.js | 22 |
| PostgreSQL | 18 |
| Docker Compose | v2, opcional |

El repositorio incluye Maven Wrapper y `package-lock.json`.

## Inicio con Docker

```bash
cp .env.example .env
# Edita .env y reemplaza todos los valores CHANGE_ME.
docker compose up --build
```

Servicios:

- Frontend: http://localhost
- API: http://localhost:8080
- Scalar, solo perfil `dev`: http://localhost:8080/scalar
- OpenAPI JSON, solo perfil `dev`: http://localhost:8080/v3/api-docs

Docker Compose ejecuta el backend con perfil `prod`, por lo que la documentación
OpenAPI permanece desactivada en ese flujo.

## Desarrollo local

### Backend

```bash
cd ecubox-backend
cp .env.example .env
./mvnw spring-boot:run
```

### Frontend

```bash
cd ecubox-frontend
cp .env.example .env
npm ci
npm run dev
```

Vite sirve la aplicación en http://localhost:5173 y redirige `/api` al backend
local.

## Verificación

```bash
cd ecubox-backend
./mvnw test

cd ../ecubox-frontend
npm test
npm run build
```

GitHub Actions ejecuta estas verificaciones en cada pull request.

## Configuración

Los secretos nunca deben versionarse. Usa:

- `.env.example` para Docker Compose.
- `ecubox-backend/.env.example` para el backend.
- `ecubox-frontend/.env.example` para el frontend.

La referencia completa está en
[docs/despliegue/VARIABLES_ENTORNO.md](docs/despliegue/VARIABLES_ENTORNO.md).

## Documentación

- [Índice de documentación](docs/README.md)
- [Referencia de la API](docs/desarrollo/API_REFERENCE.md)
- [Arquitectura backend](docs/desarrollo/ARQUITECTURA_BACKEND.md)
- [Stack tecnológico](docs/desarrollo/TECH-STACK.md)
- [Pruebas](docs/PRUEBAS.md)
- [Manual de usuario](docs/usuario/MANUAL_USUARIO.md)
- [Despliegue en Railway](docs/despliegue/RAILWAY_PRODUCCION_GUIA.md)

## Colaboración y seguridad

- [Guía de contribución](CONTRIBUTING.md)
- [Política de seguridad](SECURITY.md)
- [Nomenclatura del dominio](docs/nomenclatura.md)

## Licencia

Proyecto privado. Todos los derechos reservados.
