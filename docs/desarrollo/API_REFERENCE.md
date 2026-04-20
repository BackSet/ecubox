# ECUBOX — Referencia de la API

Documentación completa de los endpoints del backend ECUBOX (99 endpoints en 23 controllers).

---

## Información general

| Campo | Valor |
|-------|-------|
| **Base URL** | `http://localhost:8080` (dev) |
| **Formato** | JSON (`Content-Type: application/json`) |
| **Autenticación** | JWT Bearer — header `Authorization: Bearer <token>` |
| **Swagger UI** | `http://localhost:8080/swagger-ui.html` (solo perfil dev) |
| **OpenAPI spec** | `http://localhost:8080/v3/api-docs` |

### Estructura de errores

Todos los errores siguen la estructura `ApiErrorResponse`:

```json
{
  "timestamp": "2026-03-29T00:00:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Descripción del error",
  "errors": {
    "campo": "Mensaje de validación"
  }
}
```

| Código | Significado |
|--------|-------------|
| 400 | Solicitud inválida / error de validación |
| 401 | No autenticado o token inválido |
| 403 | Sin permisos suficientes |
| 404 | Recurso no encontrado |
| 409 | Conflicto de datos (duplicados, FK) |
| 500 | Error interno del servidor |

---

## Endpoints públicos (sin JWT)

Estos endpoints no requieren autenticación:

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servidor |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/register/simple` | Registro de cliente |
| GET | `/api/tracking?numeroGuia=...` | Rastreo público de paquete |
| GET | `/api/config/tarifa-calculadora` | Tarifa por libra (público) |

---

## Auth

Base: `/api/auth`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| POST | `/api/auth/login` | Público | Autenticación con credenciales |
| GET | `/api/auth/me` | JWT requerido | Perfil del usuario autenticado |
| POST | `/api/auth/register/simple` | Público | Registro simple de cliente |

### POST `/api/auth/login`

**Request:**
```json
{
  "username": "admin@ejemplo.com",
  "password": "contraseña"
}
```

**Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "username": "admin",
  "roles": ["ADMIN"],
  "permissions": ["USUARIOS_READ", "USUARIOS_WRITE", "..."]
}
```

El campo `username` acepta tanto el username como el correo electrónico del usuario.

### POST `/api/auth/register/simple`

**Request:**
```json
{
  "email": "cliente@ejemplo.com",
  "password": "minimo6chars"
}
```

**Response:** 201 Created (sin cuerpo).

### GET `/api/auth/me`

**Response (200):** Mismo formato que `LoginResponse` pero con `token: null`.

---

## Health

Base: `/api/health`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/health` | Público | Estado del servidor |

**Response (200):**
```json
{
  "status": "UP",
  "application": "ecubox-backend"
}
```

---

## Tracking

Base: `/api/tracking`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/tracking?numeroGuia=ABC123` | Público | Rastreo de paquete por número de guía |

**Response (200):** `TrackingResponse` con información del paquete, estados de rastreo, despacho y destinatario (consignatario en términos de back-office).

---

## Config pública

Base: `/api/config`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/config/tarifa-calculadora` | Público | Tarifa por libra para calculadora |

**Response (200):** `TarifaCalculadoraDTO`.

---

## Usuarios

Base: `/api/usuarios`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/usuarios` | `USUARIOS_READ` | Listar usuarios |
| GET | `/api/usuarios/{id}` | `USUARIOS_READ` | Obtener usuario por ID |
| POST | `/api/usuarios` | `USUARIOS_WRITE` | Crear usuario |
| PUT | `/api/usuarios/{id}` | `USUARIOS_WRITE` | Actualizar usuario |
| DELETE | `/api/usuarios/{id}` | `USUARIOS_WRITE` | Eliminar usuario |

### POST `/api/usuarios`

**Request (`UsuarioCreateRequest`):**
```json
{
  "username": "nuevo_usuario",
  "email": "email@ejemplo.com",
  "password": "contraseña",
  "enabled": true,
  "roleIds": [1, 2]
}
```

**Response (201):** `UsuarioDTO`.

### PUT `/api/usuarios/{id}`

**Request (`UsuarioUpdateRequest`):**
```json
{
  "email": "nuevo@email.com",
  "password": "nueva_contraseña",
  "enabled": true,
  "roleIds": [1]
}
```

**Response (200):** `UsuarioDTO`.

---

## Roles

Base: `/api/roles`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/roles` | `ROLES_READ` | Listar roles |
| GET | `/api/roles/{id}` | `ROLES_READ` | Obtener rol por ID |
| PUT | `/api/roles/{id}/permisos` | `ROLES_WRITE` | Actualizar permisos del rol |

### PUT `/api/roles/{id}/permisos`

**Request (`RolPermisosUpdateRequest`):**
```json
{
  "permisoIds": [1, 2, 3, 5]
}
```

**Response (200):** `RolDTO`.

---

## Permisos

Base: `/api/permisos`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/permisos` | `PERMISOS_READ` | Listar todos los permisos del sistema |

**Response (200):** Lista de `PermisoDTO`.

---

## Mis Consignatarios

Base: `/api/mis-consignatarios`

Consignatarios (vista cliente: "Mis destinatarios") del usuario autenticado.

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/mis-consignatarios` | `CONSIGNATARIOS_READ` | Listar consignatarios del usuario |
| GET | `/api/mis-consignatarios/sugerir-codigo?nombre=...&canton=...` | `CONSIGNATARIOS_READ` | Sugerir código para consignatario |
| GET | `/api/mis-consignatarios/{id}` | `CONSIGNATARIOS_READ` | Obtener consignatario por ID |
| POST | `/api/mis-consignatarios` | `CONSIGNATARIOS_CREATE` | Crear consignatario |
| PUT | `/api/mis-consignatarios/{id}` | `CONSIGNATARIOS_UPDATE` | Actualizar consignatario |
| DELETE | `/api/mis-consignatarios/{id}` | `CONSIGNATARIOS_DELETE` | Eliminar consignatario y sus paquetes asociados |

**Request/Response:** `ConsignatarioRequest` / `ConsignatarioDTO`.

> Nota histórica: este endpoint se llamaba `/api/mis-destinatarios` con permisos `DESTINATARIOS_*` y DTOs `DestinatarioFinal*` antes de la migración `V71__refactor_nomenclatura_industria.sql`.

---

## Mis Paquetes

Base: `/api/mis-paquetes`

Paquetes del usuario autenticado (ADMIN/OPERARIO ven todos).

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/mis-paquetes` | `PAQUETES_READ` | Listar paquetes |
| GET | `/api/mis-paquetes/page?q=&estado=&consignatarioId=&envio=&guiaMasterId=&chip=&page=&size=` | `PAQUETES_READ` | Listado paginado con filtros |
| GET | `/api/mis-paquetes/sugerir-ref?consignatarioId=...` | `PAQUETES_PESO_WRITE` | Sugerir referencia |
| POST | `/api/mis-paquetes` | `PAQUETES_CREATE` | Crear paquete |
| PUT | `/api/mis-paquetes/{id}` | `PAQUETES_UPDATE` | Actualizar paquete |
| DELETE | `/api/mis-paquetes/{id}` | `PAQUETES_DELETE` | Eliminar paquete (limpia eventos/outbox del paquete) |

**Request:** `PaqueteCreateRequest` (POST), `PaqueteUpdateRequest` (PUT).
**Response:** `PaqueteDTO`.

> El parámetro `consignatarioId` reemplaza al antiguo `destinatarioFinalId` (renombrado en V71).

---

## Agencias

Base: `/api/agencias`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/agencias` | `AGENCIAS_READ` | Listar agencias |
| GET | `/api/agencias/{id}` | `AGENCIAS_READ` | Obtener agencia por ID |
| POST | `/api/agencias` | `AGENCIAS_WRITE` | Crear agencia |
| PUT | `/api/agencias/{id}` | `AGENCIAS_WRITE` | Actualizar agencia |
| DELETE | `/api/agencias/{id}` | `AGENCIAS_WRITE` | Eliminar agencia |

**Request/Response:** `AgenciaRequest` / `AgenciaDTO`.

---

## Couriers de entrega

Base: `/api/couriers-entrega`

Empresas de paquetería de última milla (Servientrega, Laar, Tramaco, etc.).

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/couriers-entrega` | `COURIERS_ENTREGA_READ` | Listar couriers de entrega |
| GET | `/api/couriers-entrega/page?q=&page=&size=` | `COURIERS_ENTREGA_READ` | Listado paginado con búsqueda |
| GET | `/api/couriers-entrega/{id}` | `COURIERS_ENTREGA_READ` | Obtener courier por ID |
| POST | `/api/couriers-entrega` | `COURIERS_ENTREGA_WRITE` | Crear courier |
| PUT | `/api/couriers-entrega/{id}` | `COURIERS_ENTREGA_WRITE` | Actualizar courier |
| DELETE | `/api/couriers-entrega/{id}` | `COURIERS_ENTREGA_WRITE` | Eliminar courier |

**Request/Response:** `CourierEntregaRequest` / `CourierEntregaDTO`.

> Nota histórica: este endpoint se llamaba `/api/distribuidores` con permisos `DISTRIBUIDORES_*` antes de la migración `V71__refactor_nomenclatura_industria.sql`. La tabla interna se renombró de `distribuidor` a `courier_entrega` en V71 y la clase request `DistribuidorRequest` pasó a `CourierEntregaRequest` en el refactor de V73.

---

## Puntos de entrega

Base: `/api/puntos-entrega`

Sucursales del courier de entrega donde el consignatario puede retirar su paquete.

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/puntos-entrega` | `PUNTOS_ENTREGA_READ` | Listar todos |
| GET | `/api/puntos-entrega/page?q=&page=&size=` | `PUNTOS_ENTREGA_READ` | Listado paginado |
| GET | `/api/puntos-entrega/{id}` | `PUNTOS_ENTREGA_READ` | Obtener por ID |
| GET | `/api/puntos-entrega/por-courier-entrega/{courierEntregaId}` | `PUNTOS_ENTREGA_READ` | Listar puntos por courier de entrega |
| POST | `/api/puntos-entrega` | `PUNTOS_ENTREGA_WRITE` | Crear |
| PUT | `/api/puntos-entrega/{id}` | `PUNTOS_ENTREGA_WRITE` | Actualizar |
| DELETE | `/api/puntos-entrega/{id}` | `PUNTOS_ENTREGA_WRITE` | Eliminar |

**Request/Response:** `AgenciaCourierEntregaRequest` / `AgenciaCourierEntregaDTO` (la entidad `AgenciaCourierEntrega` y la tabla `agencia_courier_entrega` se exponen en API/UI como **Punto de entrega**).

> Nota histórica: este endpoint se llamaba `/api/agencias-distribuidor` con permisos `AGENCIAS_DISTRIBUIDOR_*` antes de las migraciones `V71__refactor_nomenclatura_industria.sql` (URL) y `V72__rename_permisos_puntos_entrega.sql` (permisos). La entidad/tabla `AgenciaDistribuidor`/`agencia_distribuidor` se renombró a `AgenciaCourierEntrega`/`agencia_courier_entrega` en `V73__rename_agencia_distribuidor_a_courier_entrega.sql`.

---

## Manifiestos

Base: `/api/manifiestos`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/manifiestos` | `MANIFIESTOS_READ` | Listar manifiestos |
| GET | `/api/manifiestos/{id}` | `MANIFIESTOS_READ` | Obtener manifiesto por ID |
| POST | `/api/manifiestos` | `MANIFIESTOS_WRITE` | Crear manifiesto |
| PUT | `/api/manifiestos/{id}` | `MANIFIESTOS_WRITE` | Actualizar manifiesto |
| DELETE | `/api/manifiestos/{id}` | `MANIFIESTOS_WRITE` | Eliminar manifiesto |
| POST | `/api/manifiestos/{id}/asignar-despachos` | `MANIFIESTOS_WRITE` | Asignar despachos al manifiesto |
| GET | `/api/manifiestos/{id}/despachos-candidatos` | `MANIFIESTOS_READ` | Listar despachos candidatos |
| POST | `/api/manifiestos/{id}/recalcular` | `MANIFIESTOS_WRITE` | Recalcular totales |
| PATCH | `/api/manifiestos/{id}/estado` | `MANIFIESTOS_WRITE` | Cambiar estado del manifiesto |

**Request:** `ManifiestoRequest` (CRUD), `AsignarDespachosRequest`, `CambiarEstadoManifiestoRequest`.
**Response:** `ManifiestoDTO`, `ManifiestoDespachoCandidatoDTO`.

---

## Operario: Despachos

Base: `/api/operario/despachos`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/despachos` | `DESPACHOS_WRITE` | Listar despachos |
| POST | `/api/operario/despachos` | `DESPACHOS_WRITE` | Crear despacho |
| GET | `/api/operario/despachos/{id}` | `DESPACHOS_WRITE` | Obtener despacho por ID |
| PUT | `/api/operario/despachos/{id}` | `DESPACHOS_WRITE` | Actualizar despacho |
| DELETE | `/api/operario/despachos/{id}` | `DESPACHOS_WRITE` | Eliminar despacho (desasigna sacas y revierte estado de paquetes si aplica) |
| POST | `/api/operario/despachos/aplicar-estado-por-periodo` | `DESPACHOS_WRITE` | Aplicar estado de rastreo a paquetes en rango de fechas |
| GET | `/api/operario/despachos/{id}/mensaje-whatsapp` | `DESPACHOS_WRITE` | Generar mensaje WhatsApp para despacho |

**Request:** `DespachoCreateRequest`, `AplicarEstadoPorPeriodoRequest`.
**Response:** `DespachoDTO`, `AplicarEstadoPorPeriodoResponse`, `MensajeWhatsAppDespachoGeneradoDTO`.

---

## Operario: Paquetes

Base: `/api/operario/paquetes`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/paquetes?sinPeso=true&sinSaca=true` | `PAQUETES_PESO_WRITE` | Listar paquetes con filtros |
| PATCH | `/api/operario/paquetes/{paqueteId}/saca` | `PAQUETES_PESO_WRITE` | Asignar saca a paquete |
| POST | `/api/operario/paquetes/pesos` | `PAQUETES_PESO_WRITE` | Actualización masiva de pesos |
| PATCH | `/api/operario/paquetes/{paqueteId}/estado-rastreo` | `PAQUETES_PESO_WRITE` | Cambiar estado de rastreo |
| POST | `/api/operario/paquetes/estados-destino-permitidos` | `PAQUETES_PESO_WRITE` | Estados destino permitidos para paquetes |
| POST | `/api/operario/paquetes/cambiar-estado-rastreo-bulk` | `PAQUETES_PESO_WRITE` | Cambio masivo de estado de rastreo |
| PATCH | `/api/operario/paquetes/{paqueteId}/guia-master` | `PAQUETES_PESO_WRITE` | Asignar guía master a un paquete |
| POST | `/api/operario/paquetes/asignar-guia-master` | `PAQUETES_PESO_WRITE` | Asignar guía master a varios paquetes |
| POST | `/api/operario/paquetes/buscar-por-guias` | `PAQUETES_PESO_WRITE` | Buscar paquetes por guías master |
| PATCH | `/api/operario/paquetes/{paqueteId}/liberar-incidencia` | `PAQUETES_PESO_WRITE` | Liberar incidencia de paquete |

**Request:** `PaqueteAsignarSacaRequest`, `BulkPaquetePesoRequest`, `CambiarEstadoRastreoRequest`, `CambiarEstadoRastreoBulkRequest`, `AsignarGuiaMasterBulkRequest`, `BuscarPaquetesPorGuiasRequest`, `LiberarIncidenciaRequest`.
**Response:** `PaqueteDTO`, `CambiarEstadoRastreoBulkResponse`.

---

## Operario: Sacas

Base: `/api/operario/sacas`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/sacas?sinDespacho=true` | `DESPACHOS_WRITE` | Listar sacas con filtro |
| POST | `/api/operario/sacas` | `DESPACHOS_WRITE` | Crear saca |
| POST | `/api/operario/sacas/{sacaId}/paquetes` | `DESPACHOS_WRITE` | Asignar paquetes a saca |
| PATCH | `/api/operario/sacas/{id}/tamanio` | `DESPACHOS_WRITE` | Actualizar tamaño de saca |

**Request:** `SacaCreateRequest`, `SacaAsignarPaquetesRequest`, `SacaActualizarTamanioRequest`.
**Response:** `SacaDTO`.

---

## Operario: Lotes de Recepción

Base: `/api/operario/lotes-recepcion`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/lotes-recepcion` | `DESPACHOS_WRITE` | Listar lotes |
| GET | `/api/operario/lotes-recepcion/{id}` | `DESPACHOS_WRITE` | Obtener lote por ID |
| POST | `/api/operario/lotes-recepcion` | `DESPACHOS_WRITE` | Crear lote |
| POST | `/api/operario/lotes-recepcion/{id}/guias` | `DESPACHOS_WRITE` | Agregar guías al lote |
| DELETE | `/api/operario/lotes-recepcion/{id}` | `DESPACHOS_WRITE` | Eliminar lote y revertir estado de paquetes del lote cuando aplique |

**Request:** `LoteRecepcionCreateRequest`, `AgregarGuiasLoteRequest`.
**Response:** `LoteRecepcionDTO` (GET/POST), `{ "paquetesRevertidos": number }` (DELETE).

---

## Operario: Consignatarios

Base: `/api/operario/consignatarios`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/consignatarios?search=...` | `CONSIGNATARIOS_OPERARIO` | Listar consignatarios (búsqueda) |
| GET | `/api/operario/consignatarios/{id}` | `CONSIGNATARIOS_OPERARIO` | Obtener consignatario por ID |
| PUT | `/api/operario/consignatarios/{id}` | `CONSIGNATARIOS_OPERARIO` | Actualizar consignatario |
| DELETE | `/api/operario/consignatarios/{id}` | `CONSIGNATARIOS_OPERARIO` | Eliminar consignatario |

**Request/Response:** `ConsignatarioRequest` / `ConsignatarioDTO`.

> Nota histórica: estos endpoints estaban bajo `/api/operario/destinatarios` con permiso `DESTINATARIOS_OPERARIO` antes de V71.

---

## Operario: Couriers de entrega y Puntos de entrega

Base: `/api/operario/couriers-entrega`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/couriers-entrega` | `DESPACHOS_WRITE` | Listar couriers de entrega |
| GET | `/api/operario/couriers-entrega/{courierEntregaId}/puntos-entrega` | `DESPACHOS_WRITE` | Puntos de entrega de un courier |
| POST | `/api/operario/couriers-entrega/{courierEntregaId}/puntos-entrega` | `DESPACHOS_WRITE` | Crear punto de entrega para un courier |

**Request:** `AgenciaCourierEntregaCreateOperarioRequest` (POST).

> Nota histórica: estos endpoints estaban bajo `/api/operario/distribuidores/.../agencias-distribuidor` antes de V71. Las clases pasaron de `AgenciaDistribuidor*` a `AgenciaCourierEntrega*` con V73.

---

## Operario: Agencias

Base: `/api/operario/agencias`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/agencias` | `DESPACHOS_WRITE` | Listar agencias (vista operario) |

---

## Operario: Configuración

Base: `/api/operario/config`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/config/tarifa-calculadora` | `TARIFA_CALCULADORA_READ` | Obtener tarifa por libra |
| PUT | `/api/operario/config/tarifa-calculadora` | `TARIFA_CALCULADORA_WRITE` | Actualizar tarifa |
| GET | `/api/operario/config/mensaje-whatsapp-despacho` | `DESPACHOS_WRITE` | Obtener plantilla WhatsApp |
| PUT | `/api/operario/config/mensaje-whatsapp-despacho` | `DESPACHOS_WRITE` | Actualizar plantilla WhatsApp |
| GET | `/api/operario/config/estados-rastreo-por-punto` | `ESTADOS_RASTREO_READ` | Mapeo estados por punto |
| PUT | `/api/operario/config/estados-rastreo-por-punto` | `ESTADOS_RASTREO_UPDATE` | Actualizar mapeo estados |

**Request:** `TarifaCalculadoraRequest`, `MensajeWhatsAppDespachoRequest`, `EstadosRastreoPorPuntoRequest`.
**Response:** `TarifaCalculadoraDTO`, `MensajeWhatsAppDespachoDTO`, `EstadosRastreoPorPuntoDTO`.

---

## Estados de Rastreo

Base: `/api/operario/estados-rastreo`

| Método | Ruta | Permiso | Descripción |
|--------|------|---------|-------------|
| GET | `/api/operario/estados-rastreo` | `ESTADOS_RASTREO_READ` | Listar todos los estados |
| GET | `/api/operario/estados-rastreo/activos` | `ESTADOS_RASTREO_READ` | Listar estados activos |
| GET | `/api/operario/estados-rastreo/{id}` | `ESTADOS_RASTREO_READ` | Obtener estado por ID |
| POST | `/api/operario/estados-rastreo` | `ESTADOS_RASTREO_CREATE` | Crear estado |
| PUT | `/api/operario/estados-rastreo/{id}` | `ESTADOS_RASTREO_UPDATE` | Actualizar estado |
| PATCH | `/api/operario/estados-rastreo/{id}/desactivar` | `ESTADOS_RASTREO_DELETE` | Desactivar estado (soft delete) |
| DELETE | `/api/operario/estados-rastreo/{id}` | `ESTADOS_RASTREO_DELETE` | Eliminar estado |
| GET | `/api/operario/estados-rastreo/{id}/transiciones` | `ESTADOS_RASTREO_READ` | Transiciones desde estado |
| PUT | `/api/operario/estados-rastreo/{id}/transiciones` | `ESTADOS_RASTREO_UPDATE` | Reemplazar transiciones |
| PUT | `/api/operario/estados-rastreo/orden-tracking` | `ESTADOS_RASTREO_UPDATE` | Reordenar estados en tracking |

**Request:** `EstadoRastreoRequest`, `EstadoRastreoTransicionUpsertRequest`, `EstadoRastreoOrdenTrackingRequest`.
**Response:** `EstadoRastreoDTO`, `EstadoRastreoTransicionDTO`.

---

## Referencia de permisos

Tabla de permisos usados en `@PreAuthorize` y los endpoints que protegen:

| Permiso | Endpoints |
|---------|-----------|
| `USUARIOS_READ` | GET `/api/usuarios`, `/api/usuarios/{id}` |
| `USUARIOS_WRITE` | POST/PUT/DELETE `/api/usuarios` |
| `ROLES_READ` | GET `/api/roles`, `/api/roles/{id}` |
| `ROLES_WRITE` | PUT `/api/roles/{id}/permisos` |
| `PERMISOS_READ` | GET `/api/permisos` |
| `AGENCIAS_READ` | GET `/api/agencias` |
| `AGENCIAS_WRITE` | POST/PUT/DELETE `/api/agencias` |
| `COURIERS_ENTREGA_READ` | GET `/api/couriers-entrega` |
| `COURIERS_ENTREGA_WRITE` | POST/PUT/DELETE `/api/couriers-entrega` |
| `PUNTOS_ENTREGA_READ` | GET `/api/puntos-entrega` |
| `PUNTOS_ENTREGA_WRITE` | POST/PUT/DELETE `/api/puntos-entrega` |
| `MANIFIESTOS_READ` | GET `/api/manifiestos` |
| `MANIFIESTOS_WRITE` | POST/PUT/DELETE/PATCH `/api/manifiestos` |
| `CONSIGNATARIOS_READ` | GET `/api/mis-consignatarios` |
| `CONSIGNATARIOS_CREATE` | POST `/api/mis-consignatarios` |
| `CONSIGNATARIOS_UPDATE` | PUT `/api/mis-consignatarios/{id}` |
| `CONSIGNATARIOS_DELETE` | DELETE `/api/mis-consignatarios/{id}` |
| `CONSIGNATARIOS_OPERARIO` | `/api/operario/consignatarios` |
| `PAQUETES_READ` | GET `/api/mis-paquetes` |
| `PAQUETES_CREATE` | POST `/api/mis-paquetes` |
| `PAQUETES_UPDATE` | PUT `/api/mis-paquetes/{id}` |
| `PAQUETES_DELETE` | DELETE `/api/mis-paquetes/{id}` |
| `PAQUETES_PESO_WRITE` | `/api/operario/paquetes/*` (incluye pesaje y asignación de guía master) |
| `DESPACHOS_WRITE` | `/api/operario/despachos/*`, `/api/operario/sacas/*`, `/api/operario/lotes-recepcion/*`, `/api/operario/agencias`, `/api/operario/couriers-entrega/*` |
| `TARIFA_CALCULADORA_READ` | GET `/api/operario/config/tarifa-calculadora` |
| `TARIFA_CALCULADORA_WRITE` | PUT `/api/operario/config/tarifa-calculadora` |
| `ESTADOS_RASTREO_READ` | GET `/api/operario/estados-rastreo/*`, `/api/operario/config/estados-rastreo-por-punto` |
| `ESTADOS_RASTREO_CREATE` | POST `/api/operario/estados-rastreo` |
| `ESTADOS_RASTREO_UPDATE` | PUT `/api/operario/estados-rastreo/*`, `/api/operario/config/estados-rastreo-por-punto` |
| `ESTADOS_RASTREO_DELETE` | PATCH/DELETE `/api/operario/estados-rastreo/{id}` |

**Nota:** El rol `ADMIN` tiene todos los permisos automáticamente. Algunos endpoints de operario también aceptan roles `ADMIN` u `OPERARIO` directamente.

---

## Documentación relacionada

- [README.md](../../README.md) — Inicio rápido del monorepo
- [ARQUITECTURA_BACKEND.md](ARQUITECTURA_BACKEND.md) — Arquitectura del backend
- [TECH-STACK.md](TECH-STACK.md) — Stack tecnológico
