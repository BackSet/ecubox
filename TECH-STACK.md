# ECUBOX — Stack tecnológico

Tecnologías y librerías utilizadas en el proyecto ECUBOX (backend y frontend).

---

## Backend (ecubox-backend)

### Lenguaje y framework base

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Java** | 25 | Lenguaje principal (Virtual Threads, Records, Pattern Matching) |
| **Spring Boot** | 4.0.3 | Framework base |

### Spring Boot starters

| Dependencia | Uso |
|-------------|-----|
| `spring-boot-starter-web` | API REST, controladores MVC |
| `spring-boot-starter-security` | Autenticación y autorización |
| `spring-boot-starter-data-jpa` | Persistencia con JPA/Hibernate |
| `spring-boot-starter-validation` | Validación (Jakarta Validation) |
| `spring-boot-starter-flyway` | Migraciones de base de datos |
| `spring-boot-devtools` | Recarga en desarrollo (opcional) |

### Base de datos

| Librería | Uso |
|----------|-----|
| **PostgreSQL** | Driver JDBC (runtime) |
| **Flyway** 12.2.0 | Migraciones versionadas (schema, datos) |

### Seguridad y JWT

| Librería | Versión | Uso |
|----------|---------|-----|
| **jjwt-api** | 0.13.0 | API para creación/validación de tokens JWT |
| **jjwt-impl** | 0.13.0 | Implementación (runtime) |
| **jjwt-jackson** | 0.13.0 | Serialización JSON de JWT (runtime) |

### Documentación API

| Librería | Versión | Uso |
|----------|---------|-----|
| **springdoc-openapi-starter-webmvc-ui** | 3.0.2 | OpenAPI 3 / Swagger UI |

### Utilidades

| Librería | Versión | Uso |
|----------|---------|-----|
| **Lombok** | 1.18.44 | Reducción de boilerplate (@Data, @Builder, etc.) |

El mapeo Entity — DTO se hace en los services (métodos privados) y con `PaqueteMapper` (mapper manual) para el módulo Paquete.

### Testing

| Librería | Uso |
|----------|-----|
| **spring-boot-starter-test** | Tests unitarios e integración (scope: test) |

---

## Frontend (ecubox-frontend)

### Lenguaje y build

| Tecnología | Versión | Uso |
|------------|---------|-----|
| **React** | 19.2.x | Biblioteca UI |
| **react-dom** | 19.2.x | Renderizado en el DOM |
| **TypeScript** | 6.0.x | Tipado estático (modo strict) |
| **Vite** | 8.0.x | Bundler y servidor de desarrollo |
| **@vitejs/plugin-react** | 6.0.x | Soporte React en Vite |

### Estilos

| Librería | Versión | Uso |
|----------|---------|-----|
| **Tailwind CSS** | 4.x | Utilidades CSS (@theme, variables) |
| **@tailwindcss/postcss** | 4.x | Integración PostCSS |
| **tailwind-merge** | 3.5.x | Combinación de clases Tailwind |
| **clsx** | 2.1.x | Construcción condicional de clases |
| **class-variance-authority** | 0.7.x | Variantes de componentes (CVA) |
| **tw-animate-css** | 1.4.x | Animaciones CSS para Tailwind |

### Routing y estado

| Librería | Versión | Uso |
|----------|---------|-----|
| **@tanstack/react-router** | 1.168.x | Routing type-safe |
| **@tanstack/react-query** | 5.95.x | Server state, caché, loading/error |
| **Zustand** | 5.x | Estado del cliente |

### Formularios y validación

| Librería | Versión | Uso |
|----------|---------|-----|
| **react-hook-form** | 7.72.x | Formularios controlados |
| **Zod** | 4.x | Esquemas de validación |
| **@hookform/resolvers** | 5.2.x | Integración Zod — React Hook Form |

### Componentes UI e iconos

| Librería | Versión | Uso |
|----------|---------|-----|
| **Radix UI** (accordion, dialog, dropdown, label, popover, separator, slot, tooltip) | 1.x–2.x | Primitivos headless accesibles |
| **Lucide React** | 1.7.x | Iconos |
| **Sonner** | 2.x | Toasts/notificaciones |
| **cmdk** | 1.1.x | Command palette / búsqueda |

### HTTP

| Librería | Versión | Uso |
|----------|---------|-----|
| **Axios** | 1.14.x | Cliente HTTP (interceptores JWT) |

### Exportación PDF

| Librería | Versión | Uso |
|----------|---------|-----|
| **jspdf** | 4.x | Generación de PDF en el navegador |
| **html2canvas** | 1.4.x | Captura de HTML a canvas para PDF |

---

## Resumen rápido

- **Backend:** Java 25 + Spring Boot 4.0.3 + JPA/Flyway 12.2/PostgreSQL + JWT (jjwt 0.13.0) + Springdoc OpenAPI 3.0.2 + Lombok.
- **Frontend:** React 19 + Vite 8 + TypeScript 6 + Tailwind 4 + TanStack Router & Query + Zustand + React Hook Form + Zod + Radix UI + Axios + Sonner + Lucide.

Las versiones exactas se mantienen en `ecubox-backend/pom.xml` y `ecubox-frontend/package.json`.
