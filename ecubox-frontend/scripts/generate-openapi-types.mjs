// Genera los tipos TypeScript del contrato OpenAPI del backend ECUBOX.
//
// Fuente del schema (en orden de prioridad):
//   1. Variable de entorno OPENAPI_INPUT       -> ruta a un archivo local .json/.yaml
//   2. Variable de entorno OPENAPI_URL         -> URL del backend en marcha
//   3. docs/openapi/openapi.json si existe     -> artefacto exportado por
//      ecubox-backend/scripts/export-openapi.ps1 (permite regenerar sin backend)
//   4. Por defecto: http://localhost:8080/v3/api-docs/all  (grupo "all" = /api/**)
//
// El backend solo expone /v3/api-docs en el perfil `dev`. Para regenerar contra
// el backend en vivo:
//
//   cd ecubox-backend && ./mvnw spring-boot:run        # (perfil dev, requiere DB)
//   cd ecubox-frontend && npm run api:generate
//
// O exportando primero el schema a un archivo y generando desde ahí (sin
// necesidad de tener el backend arriba al generar):
//
//   pwsh ecubox-backend/scripts/export-openapi.ps1     # -> docs/openapi/openapi.json
//   cd ecubox-frontend && npm run api:generate
//
// openapi-typescript se ejecuta vía `npx` con versión fijada para no añadirlo a
// las dependencias del proyecto: declara peer `typescript@^5.x` y el repo usa
// TypeScript 6, por lo que instalarlo como devDependency rompería `npm ci`.
// Solo se usa en este paso manual de codegen, nunca en build/test/CI.

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const OPENAPI_TYPESCRIPT_VERSION = '7.13.0';
const DEFAULT_URL = 'http://localhost:8080/v3/api-docs/all';

const here = dirname(fileURLToPath(import.meta.url));
const outFile = resolve(here, '../src/lib/api/generated/schema.d.ts');
const exportedSchema = resolve(here, '../../docs/openapi/openapi.json');

const input =
  process.env.OPENAPI_INPUT?.trim() ||
  process.env.OPENAPI_URL?.trim() ||
  (existsSync(exportedSchema) ? exportedSchema : DEFAULT_URL);

console.log(`[api:generate] Fuente del schema: ${input}`);
console.log(`[api:generate] Salida:           ${outFile}`);

// Se ejecuta vía shell con la cadena completa: en Windows, Node bloquea el
// spawn directo de `npx.cmd` sin `shell: true`, y el shell además resuelve el
// ejecutable correcto en cada plataforma. Se entrecomillan input y salida por
// si contienen espacios.
const command = `npx --yes openapi-typescript@${OPENAPI_TYPESCRIPT_VERSION} "${input}" -o "${outFile}"`;
const result = spawnSync(command, { stdio: 'inherit', shell: true });

if (result.status !== 0) {
  console.error(
    '\n[api:generate] Falló la generación. Si la fuente es el backend en vivo, ' +
      'verifica que esté arrancado en perfil dev y accesible en /v3/api-docs/all.',
  );
  process.exit(result.status ?? 1);
}

console.log('[api:generate] Tipos OpenAPI generados correctamente.');
