# Contribuir a ECUBOX

## Preparación

- JDK 25
- Node.js 22
- PostgreSQL 18, o Docker Compose

Consulta [README.md](README.md) para preparar las variables de entorno.

## Flujo de trabajo

1. Crea una rama desde la rama principal.
2. Mantén los cambios enfocados y respeta la nomenclatura del dominio descrita en [docs/nomenclatura.md](docs/nomenclatura.md).
3. No incluyas archivos `.env`, credenciales, builds, logs ni configuración personal del editor.
4. Añade o actualiza pruebas cuando cambie el comportamiento.
5. Ejecuta las verificaciones antes de abrir un pull request.

```bash
cd ecubox-backend
./mvnw test

cd ../ecubox-frontend
npm ci
npm test
npm run build
```

## Commits y pull requests

- Usa mensajes breves que expliquen la intención.
- Describe el impacto funcional y cómo se verificó.
- Señala migraciones SQL, cambios de variables de entorno o incompatibilidades.
- No modifiques migraciones Flyway aplicadas sin coordinar la actualización del historial.
