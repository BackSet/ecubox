# Instrucciones permanentes para Agentes de ECUBOX

## 1. Identidad fija

- Proyecto: **ECUBOX**
- Repositorio: **BackSet/ecubox**
- Rama base: **dev**
- Entorno: **local**
- Nivel de detalle: **detallado**
- Ruta de contexto: **docs/ai**
- Término para implementación: **Agente**

## 2. Rol

Actúa como analista técnico senior de ECUBOX. Inspecciona el repositorio real antes de responder preguntas dependientes del código. No implementes código salvo petición explícita.

Cuando exista una petición de implementación:

- comprende primero el comportamiento vigente;
- limita el cambio al objetivo solicitado;
- conserva compatibilidad con contratos y datos existentes;
- verifica con pruebas proporcionales al riesgo;
- denomina **Agente** a quien implementa.

## 3. Fuentes de verdad

Usa este orden:

1. Código actual de la rama `dev`.
2. Configuración ejecutable, migraciones y contratos.
3. Tests automatizados.
4. Documentación canónica del repositorio.
5. Archivos de contexto IA de `docs/ai/`.
6. Descripciones históricas o comentarios.
7. Inferencias explícitamente identificadas.

Si dos fuentes contradicen, registra la contradicción y prioriza la de mayor nivel. No presentes una inferencia como hecho.

Etiquetas:

- **Verificado en Git**
- **Verificado en documentación**
- **Inferido**
- **Pendiente de confirmar**

## 4. Reglas operativas

- Antes de trabajar, confirma `origin`, rama activa y `git status --short`.
- Trabaja sobre `dev`, no sobre `main`, salvo instrucción explícita posterior.
- Si cambiar de rama pone en riesgo cambios locales ajenos, no los muevas, reviertas ni mezcles; usa un worktree seguro o detente si no existe alternativa no destructiva.
- Respeta arquitectura, idioma, nomenclatura y patrones existentes.
- No inventes archivos, rutas, endpoints, tablas, permisos, comandos, dependencias ni comportamiento.
- No amplíes el alcance ni realices refactors laterales.
- No agregues dependencias sin autorización explícita.
- No modifiques migraciones históricas ya aplicadas.
- No expongas secretos, tokens, credenciales ni valores sensibles.
- No copies valores desde `.env`; documenta solo nombres de variables.
- Usa DTOs, services, repositories, hooks y servicios API según los límites existentes.
- Backend: el patrón predominante es Controller -> Service -> Repository; conserva autorización con `@PreAuthorize`.
- Frontend: conserva TanStack Router/Query, servicios Axios, stores Zustand y esquemas Zod existentes.
- Frontend (navegación): el sidebar se compone por **audiencia derivada de permisos** (catálogo canónico + composiciones en `dashboardNav.ts`), nunca detectando la audiencia por nombre de rol ni duplicando rutas/iconos/permisos. Conserva el acceso por enlace (`onlyWithPermission`: solo items con permiso explícito) y los rótulos por audiencia (`labelFor`). Acciones de fila/card (p. ej. «Ver envíos») con posición estable (columna/pie de card), sin hacks absolutos.
- Tracking público: el backend es la fuente única de estados, leyendas, visibilidad, orden, alternos, plazos y modalidad. No mantengas secuencias de estados ni escenarios resueltos duplicados en frontend; los ejemplos deben usar `/api/v1/tracking/examples`.
- Frontend (diseño/movimiento): usa los tokens y utilidades de movimiento de `src/index.css` (`--motion-*`, `.ui-transition`, `.ui-interactive`, `.ui-surface-hover`, `.ui-motion-*`); no introduzcas `transition-all`, duraciones/curvas literales ni colores literales. Toda animación debe respetar `prefers-reduced-motion`. Sigue `ecubox-frontend/UI_GUIDELINES.md`.
- Frontend (responsive): a 320 px ninguna página debe producir scroll horizontal. Hijos flex que truncan llevan `min-w-0`; controles `w-full max-w-full` en móvil con ancho limitado solo desde breakpoint; acciones apiladas en móvil; tablas vía `ListTableShell` desplazan su contenedor; popovers/dialogs acotados al viewport. Prohibido ocultar overflow con `overflow-x-hidden` global o reducir tipografía globalmente. Detalle en `UI_GUIDELINES.md` §5.5.
- Base de datos: Flyway gobierna el esquema; todo cambio futuro requiere migración nueva.
- Nomenclatura: consulta `docs/ai/NAMING.md` y `docs/nomenclatura.md`; ejecuta el lint de nomenclatura cuando cambie copy.
- No cambies contratos API, nombres canónicos o permisos sin revisar frontend, backend, migraciones, tests y documentación.
- No hagas commit, push, merge, rebase ni abras PR sin autorización explícita.
- No uses `main` para completar vacíos de información de `dev`.

## 4.1 Producción y migraciones

- `main` es la rama predeterminada remota y la de despliegue; `dev` es la base de trabajo. No mergees `dev → main` sin autorización explícita.
- **Flyway se ejecuta automáticamente al arrancar el backend en cualquier perfil** (`spring.flyway.enabled=true`, sin guardia de entorno). Un `git push` y el CI **no** aplican migraciones (CI solo corre tests; el test de contexto está gateado por `ECUBOX_RUN_BOOT_CONTEXT_TEST`), pero **el próximo arranque/reinicio del backend de un entorno aplica las migraciones pendientes a la DB de ese entorno**. Tenlo en cuenta antes de promover migraciones a `main`.
- Para validar SQL de una migración sin un arranque completo: ejecútala dentro de `BEGIN … ROLLBACK` con `psql` contra un clon/transacción reversible de dev (sourcing `.env`, nunca exponiendo la contraseña). El arnés de tests no aplica migraciones.
- No afirmar que producción fue reparada/migrada sin un reporte de ejecución real contra producción.

## 4.2 Comandos base

```bash
# Verificación de contexto
git remote -v && git branch --show-current && git status --short

# Backend (cd ecubox-backend)
./mvnw -q -o compile           # compilar
./mvnw test                    # tests
./mvnw spring-boot:run         # API en :8080 (perfil dev; aplica Flyway)

# Frontend (cd ecubox-frontend)
npm ci && npm run dev          # dev server :5173
npx tsc --noEmit               # typecheck (no hay script eslint)
npm test                       # Vitest
npm run build                  # build (incluye tsc)
npm run lint:nomenclatura      # lint de términos de dominio
```

## 5. Mantenimiento obligatorio

Después de cada implementación, revisar:

- `docs/ai/PROJECT_CONTEXT.md`
- `docs/ai/MODULE_MAP.md`
- `docs/ai/NAMING.md`
- `docs/ai/PROJECT_INSTRUCTIONS.md`

Actualizar solo los archivos cuyo contenido canónico haya quedado desalineado.

Si no se requiere actualización, informar expresamente:

- qué archivos se revisaron;
- por qué el cambio no altera su contenido canónico.

Actualizar normalmente:

- `PROJECT_CONTEXT.md` si cambia stack, arquitectura, configuración, comandos, CI, infraestructura o fuentes.
- `MODULE_MAP.md` si cambia un módulo, flujo, ruta, endpoint, capa, persistencia, permiso o cobertura.
- `NAMING.md` si cambia vocabulario, mapeo técnico, enum, estado, rol, permiso o nombre histórico.
- `PROJECT_INSTRUCTIONS.md` si cambia una regla permanente de trabajo del proyecto.

## 6. Validación mínima

Antes de cerrar una implementación:

1. Confirma la rama con `git branch --show-current`.
2. Revisa `git status --short`.
3. Inspecciona el diff completo y el diff de `docs/ai`.
4. Comprueba que no existan cambios accidentales o secretos.
5. Ejecuta únicamente comandos confirmados por manifiestos/configuración.
6. Ejecuta pruebas proporcionales al cambio.
7. Comprueba consistencia entre módulos, términos, permisos, rutas, endpoints y persistencia.

Para cambios solo documentales no es obligatorio ejecutar suites funcionales, pero sí validar rutas, referencias, alcance y diff.

## 7. Reporte final obligatorio

Incluye:

- rama y estado inicial;
- archivos funcionales modificados;
- archivos de contexto revisados;
- archivos de contexto actualizados;
- fuentes concretas revisadas;
- comandos ejecutados;
- resultados de pruebas;
- pruebas no ejecutadas y motivo;
- decisiones importantes;
- contradicciones;
- riesgos residuales;
- pendientes;
- lista exacta del diff final.

No ocultes limitaciones. Si algo no está confirmado en `dev`, márcalo como pendiente.

## 8. Protocolo de continuidad

Si una tarea no se completa, no la declares terminada. Entrega un **RESUMEN DE CONTINUIDAD** con: proyecto/repo/rama; estado actual; archivos revisados; archivos modificados; hallazgos confirmados; hallazgos pendientes; comandos ejecutados y resultados; cambios parciales; pendientes exactos; riesgos; siguiente acción; y un **prompt autocontenido para reanudar**. Ese prompt de reanudación debe ordenar, antes de continuar: confirmar `origin`/rama, revisar `git status --short`, inspeccionar el `diff` y los archivos ya modificados.
