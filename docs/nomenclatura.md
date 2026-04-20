# Glosario de nomenclatura ECUBOX

Esta es la **única fuente de verdad** para los nombres de los conceptos del dominio del sistema ECUBOX. Cada término del negocio tiene **un solo nombre canónico** y debe usarse igual en:

- UI (sidebar, títulos, labels, placeholders, mensajes, columnas, toasts).
- Tipos TypeScript del frontend.
- Entidades, DTOs, repositorios, servicios y endpoints del backend.
- Tablas y columnas de la base de datos.
- Documentación (`docs/`, READMEs, JSDoc, Javadoc).
- Mensajes de error y eventos del outbox.

> **Regla de code review**: cualquier término nuevo del dominio debe agregarse aquí **primero**. Si encuentras una variante (sinónimo) de un término ya canónico, es un bug y debe corregirse.

El glosario está alineado con la terminología estándar de la industria courier internacional (IATA: MAWB/HAWB; aduana: consignatario, manifiesto; couriers USA→LatAm: casillero) y con operadores ecuatorianos (Servientrega, Laar).

---

## Tabla canónica resumen

| Concepto | Término canónico | Variantes prohibidas |
|---|---|---|
| Dirección USA del cliente | **Casillero** | "Oficina en USA", "Destino agencia USA", "Agencia EEUU" |
| Documento consolidación | **Guía master** (con tilde) | "Guía" (como título de lista), "GuiaMaster", "guia master" |
| Pieza de una guía master | **Pieza** | "Paquete individual" |
| Unidad suelta sin guía master | **Paquete** | — |
| Empresa última milla | **Courier de entrega** | "Distribuidor", "Empresa de entrega" |
| Sucursal del courier | **Punto de entrega** | "Agencia asociada", "Agencia de distribuidor" |
| Receptor del envío (operación) | **Consignatario** | "Destinatario final", "DestinatarioFinal" |
| Receptor del envío (vista cliente) | **Destinatario** | "Destinatario final" |
| Documento aduanero | **Manifiesto** | "Manifiestos de carga", "Manifiestos aéreos" |
| Grupo de piezas consolidadas | **Envío consolidado** | — |
| Llegada a bodega | **Lote de recepción** | "Llegada", "Ingreso" |
| Proceso de pesar | **Pesaje** | "Cargar pesos", "Registro de peso" |
| Salida a cliente final | **Despacho** | — |
| Sistema de estados | **Rastreo** | "Tracking", "Seguimiento" |
| Paquete no retirado a tiempo | **Paquete vencido** | "Retiro vencido" |
| Peso (unidad) | **lbs** | "lb" |

---

## Glosario detallado

### 1. Casillero

**Qué es:** dirección física en EEUU asignada a cada cliente para que reciba sus compras online antes de que ECUBOX las consolide y envíe a Ecuador.

**Cuándo usarlo:** en cualquier referencia a la dirección USA del cliente.

**Ejemplo:** *"Tu casillero es ECU-CV01 y se ubica en 7301 NW 35th Terrace, Doral, FL 33122."*

**Términos prohibidos:** "Oficina en USA", "Destino agencia USA", "Agencia EEUU", "bodega USA".

**Aterriza en:**
- UI: ruta `/casillero`, label sidebar "Mi casillero", carpeta `pages/dashboard/casillero/`.
- Backend: no es entidad propia (se compone de la dirección de la oficina USA y el `Casillero.codigo` del usuario, equivalente a `usuario.username` o un campo dedicado).

---

### 2. Guía master

**Qué es:** documento de transporte aéreo que agrupa una o varias **piezas** físicas que viajan juntas para un mismo cliente. Equivale al *Master Air Waybill (MAWB)* en IATA.

**Cuándo usarlo:** siempre que se hable de la guía agrupadora. En vista del cliente (`/mis-guias`) puede mostrarse como "guía" a secas porque el cliente no distingue master/hija; en back-office siempre es "guía master".

**Ejemplo:** *"La guía master 2LUS07105×48000001 contiene 7 piezas, todas con el mismo consignatario."*

**Términos prohibidos:** "guia master" (sin tilde), "Guías" como título de la pantalla del módulo (debe ser "Guías master").

**Aterriza en:**
- UI: ruta `/guias-master`, label "Guías master".
- Backend: entidad `GuiaMaster`, tabla `guia_master`.

---

### 3. Pieza vs Paquete

**Pieza** es cada unidad física que pertenece a una **guía master**. Se enumera dentro de su guía (`piezaNumero / piezaTotal`, p. ej. *"3/7"*).

**Paquete** es el mismo objeto físico cuando se habla de él como entidad gestionable individualmente (sin necesariamente referirse a su agrupación).

**Regla:** la entidad backend se llama `Paquete` (no se renombra). En la UI usar:

- *"Pieza"* cuando se enumera dentro de una guía master (columnas como "Guía master / Pieza", progreso "5/7 piezas pesadas").
- *"Paquete"* en módulos de gestión transversal ("Gestión de paquetes", "Paquetes vencidos", "Cambiar estado de paquetes").

**Términos prohibidos:** "Paquete individual" (redundante).

**Aterriza en:** entidad `Paquete`, tabla `paquete`, ruta `/paquetes`.

---

### 4. Courier de entrega

**Qué es:** empresa de paquetería de última milla que entrega los paquetes al consignatario en Ecuador (Servientrega, Laar, Tramaco, etc.).

**Cuándo usarlo:** siempre que se hable de la empresa que hace la entrega final. En catálogos, formularios, columnas, tracking público.

**Ejemplo:** *"Selecciona el courier de entrega que llevará tu paquete a Cuenca."*

**Términos prohibidos:** "Distribuidor", "Distribuidores" (ambiguo, sugiere venta), "Empresa de entrega" (legible pero menos preciso).

**Aterriza en:**
- UI: ruta `/couriers-entrega`, label "Couriers de entrega", carpeta `pages/dashboard/couriers-entrega/`.
- Backend: entidad `CourierEntrega`, tabla `courier_entrega`, endpoint `/api/couriers-entrega`.
- Permisos: `COURIERS_ENTREGA_READ`, `COURIERS_ENTREGA_WRITE`.

---

### 5. Punto de entrega

**Qué es:** sucursal u oficina del **courier de entrega** donde el consignatario puede retirar su paquete (cuando el envío no es a domicilio).

**Cuándo usarlo:** al referirse a las sucursales del courier asociadas a ECUBOX.

**Términos prohibidos:** "Agencia asociada", "Agencia de distribuidor", "Agencia distribuidor", "Agencia del distribuidor".

**Aterriza en:**
- UI: ruta `/puntos-entrega`, label "Puntos de entrega".
- Backend: entidad `AgenciaCourierEntrega`, tabla `agencia_courier_entrega`, columna `courier_entrega_id` como FK al courier. Endpoint REST `/api/puntos-entrega` (UI/permiso) — la entidad se renombró desde `AgenciaDistribuidor` en `V73__rename_agencia_distribuidor_a_courier_entrega.sql`.
- Permisos: `PUNTOS_ENTREGA_READ`, `PUNTOS_ENTREGA_WRITE`.

---

### 6. Consignatario / Destinatario

**Qué es:** persona o empresa que recibe el paquete en Ecuador. Es un dato del cliente (un cliente puede tener varios consignatarios: él mismo, su esposa, su empresa, etc.).

**Regla de doble término según contexto:**

- **Consignatario** en back-office y operación (es el término aduanero técnico, alineado con el resto de la industria logística).
- **Destinatario** en vista del cliente final y tracking público (es más amigable, sin jerga).

**Términos prohibidos:** "Destinatario final" (redundante), "Cliente" como sinónimo de consignatario (cliente es el dueño del casillero).

**Aterriza en:**
- UI back-office: ruta `/consignatarios`, label "Consignatarios".
- UI cliente (`/mis-guias`, `/tracking`): "Mis destinatarios", "Destinatario".
- Backend: entidad `Consignatario`, tabla `consignatario`, columna `consignatario_id` en `paquete` y `guia_master`, endpoint `/api/consignatarios`.
- Permisos: `CONSIGNATARIOS_READ`, `CONSIGNATARIOS_WRITE`, `MIS_CONSIGNATARIOS_*`.

---

### 7. Manifiesto

**Qué es:** documento aduanero/operativo con el listado de bultos transportados.

**Cuándo usarlo:** "Manifiesto" a secas. Si hay que distinguir el del envío consolidado del de despacho, calificar con sufijo (ej. "Manifiesto del envío consolidado", "Manifiesto de despacho").

**Términos prohibidos:** "Manifiestos de carga" (redundante), "Manifiestos aéreos" (mezcla con envío consolidado).

**Aterriza en:** ruta `/manifiestos`, label "Manifiestos".

---

### 8. Envío consolidado

**Qué es:** agrupación de varias guías master que viajan juntas en un mismo vuelo desde EEUU a Ecuador.

**Términos prohibidos:** "Carga aérea" (como sinónimo).

**Aterriza en:** entidad `EnvioConsolidado`, ruta `/envios-consolidados`, label "Envíos consolidados".

---

### 9. Lote de recepción

**Qué es:** agrupación operativa de paquetes que ingresan al sistema al llegar a bodega (escaneo masivo).

**Términos prohibidos:** "Llegada", "Ingreso de mercancía".

**Aterriza en:** ruta `/lotes-recepcion`, label "Lotes de recepción".

---

### 10. Pesaje

**Qué es:** proceso de registrar el peso real de cada paquete una vez recibido.

**Cuándo usarlo:** como sustantivo del proceso ("Pesaje", "Pendiente de pesaje"). Para el dato puntual usar "Peso".

**Términos prohibidos:** "Cargar pesos", "Registro de peso".

**Aterriza en:** ruta `/pesaje` (renombrada desde `/cargar-pesos`), label "Pesaje".

---

### 11. Despacho

**Qué es:** proceso de salida del paquete desde la bodega Ecuador hacia el consignatario, sea por entrega a domicilio (vía courier de entrega) o retiro en agencia ECUBOX / punto de entrega.

**Cuándo usarlo:** "Despacho" para la entidad y el proceso.

**Aterriza en:** entidad `Despacho`, ruta `/despachos`, label "Gestión de despachos".

---

### 12. Rastreo (no "tracking" ni "seguimiento")

**Qué es:** proceso por el cual se conoce el estado actual de un paquete a lo largo de su ciclo de vida.

**Cuándo usarlo:** en cualquier copy visible al usuario. *"Rastrear paquete"*, *"Estado de rastreo"*, *"Rastreo público"*.

**Términos prohibidos:** "Tracking" (anglicismo) y "Seguimiento" como sinónimos en copy de usuario.

**Excepciones técnicas (no se cambian):**
- `trackingBase`, `tracking_base`: identificador técnico de la guía master (mantener).
- Logs internos como `LoggingTrackingOutboxPublisher`, `TrackingEventService`: mantener (son nombres técnicos del módulo).
- Variables de código y nombres de archivos en `src/services/tracking.service.ts`: mantener (son técnicos).

---

### 13. Paquete vencido

**Qué es:** paquete que superó el plazo máximo de retiro fijado por el courier de entrega o ECUBOX.

**Términos prohibidos:** "Retiro vencido", "Retiros vencidos".

**Aterriza en:** ruta `/paquetes-vencidos`, label "Paquetes vencidos".

---

### 14. Peso (unidad)

Siempre **lbs** (libras), nunca "lb" suelto. La unidad debe acompañar todo dato numérico de peso (ej. *"12.4 lbs"*, *"Peso (lbs)"*).

---

## Anexo A — Mapeo entidad-DB-endpoint-ruta

| Concepto | Entidad Java | Tabla DB | Endpoint REST | Ruta frontend | Permiso |
|---|---|---|---|---|---|
| Casillero | (no es entidad) | (datos en `usuario`) | `/api/casillero` | `/casillero` | público |
| Guía master | `GuiaMaster` | `guia_master` | `/api/guias-master` | `/guias-master` | `GUIAS_MASTER_*` |
| Paquete / Pieza | `Paquete` | `paquete` | `/api/paquetes` | `/paquetes` | `PAQUETES_*` |
| Consignatario | `Consignatario` | `consignatario` | `/api/consignatarios` | `/consignatarios` | `CONSIGNATARIOS_*` |
| Courier de entrega | `CourierEntrega` | `courier_entrega` | `/api/couriers-entrega` | `/couriers-entrega` | `COURIERS_ENTREGA_*` |
| Punto de entrega | `AgenciaCourierEntrega` | `agencia_courier_entrega` | `/api/puntos-entrega` | `/puntos-entrega` | `PUNTOS_ENTREGA_*` |
| Agencia ECUBOX | `Agencia` | `agencia` | `/api/agencias` | `/agencias` | `AGENCIAS_*` |
| Envío consolidado | `EnvioConsolidado` | `envio_consolidado` | `/api/envios-consolidados` | `/envios-consolidados` | `ENVIOS_CONSOLIDADOS_*` |
| Manifiesto | `Manifiesto` | `manifiesto` | `/api/manifiestos` | `/manifiestos` | `MANIFIESTOS_*` |
| Lote de recepción | `LoteRecepcion` | `lote_recepcion` | `/api/lotes-recepcion` | `/lotes-recepcion` | `DESPACHOS_WRITE` |
| Despacho | `Despacho` | `despacho` | `/api/despachos` | `/despachos` | `DESPACHOS_*` |

---

## Anexo B — Migración histórica (V71, V72, V73)

El refactor de nomenclatura se aplicó en tres migraciones secuenciales:

- **`V71__refactor_nomenclatura_industria.sql`**: renombre de tablas, columnas y permisos del dominio principal (`distribuidor` → `courier_entrega`, `destinatario_final` → `consignatario`, etc.).
- **`V72__rename_permisos_puntos_entrega.sql`**: permisos `AGENCIAS_DISTRIBUIDOR_*` → `PUNTOS_ENTREGA_*`.
- **`V73__rename_agencia_distribuidor_a_courier_entrega.sql`**: renombre del sub-dominio `agencia_distribuidor` (tablas, columnas FK, valor del enum `tipo_entrega` y `codigo_secuencia.entity`).

Equivalencias en código antiguo (anteriores a V71/V72/V73):

| Antes (V70 y anteriores) | Después (V73+) | Migración |
|---|---|---|
| `distribuidor` (tabla) | `courier_entrega` | V71 |
| `destinatario_final` | `consignatario` | V71 |
| `destinatario_final_version` | `consignatario_version` | V71 |
| `paquete.destinatario_final_id` | `paquete.consignatario_id` | V71 |
| `guia_master.destinatario_final_id` | `guia_master.consignatario_id` | V71 |
| `agencia_distribuidor.distribuidor_id` | `agencia_courier_entrega.courier_entrega_id` | V71 (col) + V73 (tabla) |
| Permisos `DISTRIBUIDORES_*` | `COURIERS_ENTREGA_*` | V71 |
| Permisos `DESTINATARIOS_*` | `CONSIGNATARIOS_*` | V71 |
| Permisos `AGENCIAS_DISTRIBUIDOR_*` | `PUNTOS_ENTREGA_*` | V72 |
| Tabla `agencia_distribuidor` | `agencia_courier_entrega` | V73 |
| Tabla `agencia_distribuidor_version` | `agencia_courier_entrega_version` | V73 |
| `despacho.agencia_distribuidor_id` | `despacho.agencia_courier_entrega_id` | V73 |
| `despacho.agencia_distribuidor_version_id` | `despacho.agencia_courier_entrega_version_id` | V73 |
| `tipo_entrega = 'AGENCIA_DISTRIBUIDOR'` | `'AGENCIA_COURIER_ENTREGA'` | V73 |
| `codigo_secuencia.entity = 'AGENCIA_DISTRIBUIDOR'` | `'AGENCIA_COURIER_ENTREGA'` | V73 |
| `outbox_event.payload_json` con `destinatarioFinalId` | `consignatarioId` | V71 |
