# ECUBOX Frontend

SPA construida con React 19, Vite 8 y TypeScript 6. Incluye páginas públicas (landing, tracking, calculadora, login, registro) y un dashboard interno con gestión completa del sistema logístico.

## Configuración local

1. Copiar y editar las variables de entorno:

```bash
cp .env.example .env
```

2. Instalar dependencias y arrancar:

```bash
npm install
npm run dev
```

El servidor de desarrollo arranca en `http://localhost:5173`.

## Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Compilar TypeScript + build de producción |
| `npm run preview` | Previsualizar el build de producción |
| `npm audit` | Auditar vulnerabilidades |

## Estructura de directorios

```
src/
├── main.tsx              # Entrada de la aplicación
├── index.css             # Estilos globales y tokens de tema
├── routes/router.tsx     # TanStack Router (rutas y guards)
├── app/layout/           # MainLayout, Header, Sidebar
├── pages/                # Páginas organizadas por ruta
│   ├── home/             # Landing page
│   ├── login/            # Inicio de sesión
│   ├── registro/         # Registro de usuario
│   ├── tracking/         # Rastreo público
│   ├── calculadora/      # Calculadora de tarifas
│   └── dashboard/        # Módulos del dashboard (paquetes, despachos, etc.)
├── components/           # Componentes reutilizables
│   ├── ui/               # Primitivos shadcn/ui
│   └── brand/            # Logo ECUBOX
├── hooks/                # Hooks de datos (queries/mutations)
├── stores/               # Zustand (auth, theme, ui)
├── lib/
│   ├── api/              # Cliente HTTP y servicios por dominio
│   └── pdf/              # Generación de PDFs
├── types/                # Tipos TypeScript por dominio
└── assets/brand/         # SVGs del logo
```

## Stack principal

- **UI:** React 19 + Radix UI (shadcn/ui) + Lucide React
- **Routing:** TanStack Router (type-safe)
- **Estado servidor:** TanStack Query v5
- **Estado cliente:** Zustand
- **Formularios:** React Hook Form + Zod
- **Estilos:** Tailwind CSS 4

## Documentación detallada

- [UX-UI-DESIGN.md](../UX-UI-DESIGN.md) — Sistema de diseño UX/UI
- [TECH-STACK.md](../TECH-STACK.md) — Stack tecnológico completo
