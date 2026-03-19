# Candas — Stack tecnológico y librerías

Documentación de las tecnologías y librerías utilizadas en el proyecto Candas (backend y frontend).

---

## Backend (candas-backend)

### Lenguaje y framework base
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **Java** | 25 | Lenguaje principal (Virtual Threads, Records, Pattern Matching) |
| **Spring Boot** | 4.0.1 | Framework base |

### Spring Boot starters
| Dependencia | Uso |
|-------------|-----|
| `spring-boot-starter-webmvc` | API REST, controladores MVC |
| `spring-boot-starter-security` | Autenticación y autorización |
| `spring-boot-starter-data-jpa` | Persistencia con JPA/Hibernate |
| `spring-boot-starter-validation` | Validación (Jakarta Validation) |
| `spring-boot-starter-flyway` | Migraciones de base de datos |
| `spring-boot-devtools` | Recarga en desarrollo (opcional) |

### Base de datos
| Librería | Uso |
|----------|-----|
| **PostgreSQL** | Driver JDBC (runtime) |
| **Flyway** | Migraciones versionadas (schema, datos) |

### Seguridad y JWT
| Librería | Versión | Uso |
|----------|---------|-----|
| **jjwt-api** | 0.12.5 | API para creación/validación de tokens JWT |
| **jjwt-impl** | 0.12.5 | Implementación (runtime) |
| **jjwt-jackson** | 0.12.5 | Serialización JSON de JWT (runtime) |

### Documentación API
| Librería | Versión | Uso |
|----------|---------|-----|
| **springdoc-openapi-starter-webmvc-ui** | 2.7.0 | OpenAPI 3 / Swagger UI |

### Mapeo y utilidades
| Librería | Uso |
|----------|-----|
| **Lombok** | (heredada de Spring Boot) Reducción de boilerplate (@Data, @Builder, etc.) |

El mapeo Entity ↔ DTO se hace en los services (métodos privados) y con **PaqueteMapper** (mapper manual) para el módulo Paquete.

### Reportes y documentos
| Librería | Versión | Uso |
|----------|---------|-----|
| **Apache POI** | 5.5.1 | Generación de Excel (.xlsx) |
| **poi-ooxml** | 5.5.1 | Formato OOXML para Excel |
| **Barbecue** | 1.5-beta1 | Códigos de barras |

Los PDF se generan en el frontend con **jspdf**. Para reportes PDF en backend ver [candas-backend/docs/JasperReportsUsage.md](candas-backend/docs/JasperReportsUsage.md).

### Testing
| Librería | Uso |
|----------|-----|
| **spring-boot-starter-test** | Tests unitarios e integración (scope: test) |

---

## Frontend (candas-frontend)

### Lenguaje y build
| Tecnología | Versión | Uso |
|------------|---------|-----|
| **React** | 19.2.0 | Biblioteca UI |
| **react-dom** | 19.2.0 | Renderizado en el DOM |
| **TypeScript** | 5.9.x | Tipado estático (modo strict) |
| **Vite** | 7.2.x | Bundler y servidor de desarrollo |
| **@vitejs/plugin-react** | 5.1.x | Soporte React en Vite |

### Estilos
| Librería | Versión | Uso |
|----------|---------|-----|
| **Tailwind CSS** | 4.x | Utilidades CSS (@theme, variables) |
| **@tailwindcss/postcss** | 4.x | Integración PostCSS |
| **tailwind-merge** | 3.4.x | Combinación de clases Tailwind |
| **clsx** | 2.1.x | Construcción condicional de clases |
| **class-variance-authority** | 0.7.x | Variantes de componentes (CVA) |

### Routing y estado
| Librería | Versión | Uso |
|----------|---------|-----|
| **@tanstack/react-router** | 1.95.x | Routing type-safe |
| **@tanstack/react-query** | 5.90.x | Server state, caché, loading/error |
| **Zustand** | 5.x | Estado del cliente |

### Formularios y validación
| Librería | Versión | Uso |
|----------|---------|-----|
| **react-hook-form** | 7.68.x | Formularios controlados |
| **Zod** | 4.x | Esquemas de validación |
| **@hookform/resolvers** | 5.2.x | Integración Zod ↔ React Hook Form |

### Componentes UI e iconos
| Librería | Versión | Uso |
|----------|---------|-----|
| **@radix-ui/react-accordion** | 1.2.x | Acordeón |
| **@radix-ui/react-alert-dialog** | 1.1.x | Diálogos de confirmación |
| **@radix-ui/react-checkbox** | 1.3.x | Checkbox |
| **@radix-ui/react-dialog** | 1.1.x | Modales/diálogos |
| **@radix-ui/react-dropdown-menu** | 2.1.x | Menús desplegables |
| **@radix-ui/react-scroll-area** | 1.2.x | Área de scroll |
| **@radix-ui/react-select** | 2.2.x | Select |
| **@radix-ui/react-slot** | 1.2.x | Composición de componentes |
| **Lucide React** | 0.561.x | Iconos |
| **Sonner** | 1.5.x | Toasts/notificaciones |
| **cmdk** | 1.1.x | Command palette / búsqueda |

### HTTP y datos
| Librería | Versión | Uso |
|----------|---------|-----|
| **Axios** | 1.13.x | Cliente HTTP (interceptores JWT) |

### Exportación y códigos
| Librería | Versión | Uso |
|----------|---------|-----|
| **jspdf** | 4.x | Generación de PDF en el navegador |
| **xlsx** | 0.18.x | Lectura/escritura de Excel |
| **qrcode** | 1.5.x | Generación de códigos QR |
| **react-barcode** | 1.6.x | Códigos de barras en React |

### Linting y tipos (dev)
| Librería | Uso |
|----------|-----|
| **ESLint** + plugins (react-hooks, react-refresh) | Linting |
| **typescript-eslint** | Reglas TypeScript |
| **@types/node**, **@types/react**, **@types/react-dom**, **@types/qrcode**, **@types/xlsx** | Definiciones de tipos |

---

## Resumen rápido

- **Backend:** Java 25 + Spring Boot 4 + JPA/Flyway/PostgreSQL + JWT (jjwt 0.12.5) + Springdoc OpenAPI + Apache POI + Lombok.
- **Frontend:** React 19 + Vite 7 + TypeScript 5.9 + Tailwind 4 + TanStack Router & Query + Zustand + React Hook Form + Zod + Radix UI + Axios + Sonner + Lucide.

Las versiones exactas se mantienen en `candas-backend/pom.xml` y `candas-frontend/package.json`.
