# ECUBOX Backend

API REST construida con Java 25 y Spring Boot 4.0.3. Gestiona autenticación JWT, paquetes, despachos, manifiestos, tracking y más.

## Configuración local

1. Crear la base de datos PostgreSQL:

```sql
CREATE DATABASE ecubox_v1;
```

2. Copiar y editar las variables de entorno:

```bash
cp .env.example .env
```

3. Ejecutar:

```bash
./mvnw spring-boot:run        # Linux/Mac
.\mvnw.cmd spring-boot:run    # Windows
```

El servidor arranca en `http://localhost:8080` con perfil `dev`.

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `./mvnw spring-boot:run` | Arrancar en modo desarrollo |
| `./mvnw clean package` | Compilar y generar JAR |
| `./mvnw clean package -DskipTests` | Compilar sin tests |
| `./mvnw test` | Ejecutar tests |
| `./mvnw flyway:info` | Ver estado de migraciones |

## Estructura de paquetes

```
com.ecubox.ecubox_backend/
├── controller/    # REST controllers
├── service/       # Lógica de negocio
├── repository/    # JpaRepository
├── entity/        # Entidades JPA
│   └── enums/     # Enums de dominio
├── dto/           # Request/Response DTOs
├── config/        # Security, CORS, JWT filter, Swagger
├── security/      # UserDetailsService
├── exception/     # GlobalExceptionHandler
└── util/          # Constantes y helpers
```

## Migraciones (Flyway)

Las migraciones SQL viven en `src/main/resources/db/migration/`. Se ejecutan automáticamente al arrancar. Convención de nombres: `V{N}__{descripcion}.sql`.

## API Docs (Swagger)

En perfil `dev`, Swagger UI está disponible en:
- UI: `http://localhost:8080/swagger-ui.html`
- JSON: `http://localhost:8080/v3/api-docs`

En perfil `prod`, Swagger está desactivado.

## Documentación detallada

- [API_REFERENCE.md](../docs/desarrollo/API_REFERENCE.md) — Referencia completa de la API (99 endpoints)
- [ARQUITECTURA_BACKEND.md](../docs/desarrollo/ARQUITECTURA_BACKEND.md) — Arquitectura en capas, seguridad y dominio
- [TECH-STACK.md](../docs/desarrollo/TECH-STACK.md) — Stack tecnológico completo
- [Variables de entorno](../docs/despliegue/VARIABLES_ENTORNO.md) — Ejemplos por entorno
