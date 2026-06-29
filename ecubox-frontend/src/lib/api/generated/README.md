# Tipos generados desde OpenAPI

`schema.d.ts` se **genera automáticamente** desde el contrato OpenAPI del backend
con `openapi-typescript`. No editar a mano (cada regeneración lo sobrescribe).

## Estado actual

El `schema.d.ts` versionado se generó desde el **contrato real** del backend
(OpenAPI 3.1, grupo `all` = `/api/**`, 172 rutas), exportado a
`docs/openapi/openapi.json`. Regenerar tras cualquier cambio de contrato.

> Nota de contrato: springdoc emite respuestas con media type `*/*` y schemas
> laxos (propiedades opcionales, sin `null`, enums como `string`). Por eso los
> servicios migrados conservan sus tipos de dominio manuales y puentean con casts
> localizados. Mejorar las anotaciones del backend permitiría tipos más estrictos.

## Regenerar

El backend solo expone `/v3/api-docs` en el perfil `dev`. El grupo `all` agrupa
todo `/api/**`.

```bash
# 1) Backend arrancado en perfil dev (requiere PostgreSQL y .env)
cd ecubox-backend && ./mvnw spring-boot:run

# 2) En otra terminal: genera los tipos desde el contrato en vivo
cd ecubox-frontend && npm run api:generate
```

Fuentes alternativas (variables de entorno que lee `scripts/generate-openapi-types.mjs`):

```bash
# Otra URL (p. ej. un entorno o un puerto distinto)
OPENAPI_URL=http://localhost:8080/v3/api-docs/all npm run api:generate

# Un archivo de schema exportado/versionado
OPENAPI_INPUT=./openapi/ecubox-openapi.json npm run api:generate
```

> El contrato OpenAPI es un artefacto **técnico/público** (formas de request/response,
> sin datos sensibles). Aun así, regenerar siempre desde una fuente de confianza.
