# Detonadores de estado — estados de producción

Esta tabla indica, para **cada estado de rastreo actual**, qué **detonador** lo aplica y
**dónde** se dispara esa acción. Los detonadores no están fijos en el código: cada uno es
un "estado por punto" configurable en **Parámetros → Estados de rastreo por punto**, así que
la asignación estado ↔ detonador se puede cambiar sin tocar el sistema.

---

## 1. Detonadores disponibles (estados por punto)

Son los puntos del flujo donde el sistema aplica un estado automáticamente. En Parámetros se
elige **qué estado** del catálogo corresponde a cada uno.

| Detonador (punto) | Se dispara cuando… | Dónde se ejecuta la acción |
|---|---|---|
| Registro de paquete | Se completa el registro de un paquete | Paquetes → Registrar paquete |
| Asociar a envío consolidado | El paquete se agrega o reasigna a un consolidado | Consolidados → agregar paquetes |
| Lote de recepción | El paquete entra al procesar un lote | Lotes de recepción → crear / agregar guías |
| Llega a destino | El paquete se recibe físicamente en el lote | Lotes de recepción → procesar lote |
| Asociar a guía master | El paquete se asocia a una guía master | Guías master → asociar paquetes |
| Sale de origen | El consolidado del paquete se marca como enviado desde USA | Consolidados → enviar desde USA |
| En despacho | El paquete se agrega a un despacho (saca) | Despachos → crear / editar despacho |
| Avance masivo por despacho | El operario aplica avance a despachos | Despachos → "Aplicar estado por periodo" / "a despachos" |
| Aviso de confirmación de entrega | El paquete alcanza el estado configurado | Sistema → notificación push al cliente |
| Entrega confirmada por cliente | El cliente confirma recepción de sus piezas | Mis entregas → Confirmar entrega |
| Cambio manual | El operario cambia el estado a mano (paquete sin saca) | Operaciones → Estados de paquetes |
| Inicio / fin de cuenta regresiva | Anclas de cálculo de plazo (no cambian estado por sí solas) | Parámetros → Rastreo; visible en rastreo público |

---

## 2. Estados actuales y su detonador (configuración de producción)

| # | Estado (código) | Nombre | Tipo | Detonador que lo aplica | Dónde se dispara |
|---|---|---|---|---|---|
| 1 | `REGISTRADO` | Registrado EE.UU | Normal | Registro de paquete | Paquetes → Registrar paquete |
| 2 | `PLANILLA` | En planilla | Normal | Asociar a envío consolidado | Consolidados → agregar paquetes |
| 3 | `MANIFESTADO` | Manifestado | Normal | Asociar a guía master | Guías master → asociar paquetes |
| 4 | `VUELO` | En vuelo a Ecuador | Normal | Sale de origen | Consolidados → enviar desde USA |
| 5 | `LLEGA_A_ADUANA` | Llega a aduana destino | Normal | Llega a destino | Lotes de recepción → procesar lote |
| 6 | `EN_BODEGA` | Llega a bodega Quito | Normal | Lote de recepción · *ancla inicio cuenta regresiva* | Lotes de recepción → procesar lote |
| 7 | `TRABAJO` | Preparando envío | Normal | En despacho | Despachos → crear / editar despacho |
| 8 | `EN_TRANSITO` | En tránsito a destino | Normal | Avance masivo por despacho | Despachos → "Aplicar estado por periodo" / "a despachos" |
| 9 | `ENTREGADO` | Entregado a destinatario | Normal | Cambio manual **o** Entrega confirmada por cliente · *ancla fin cuenta regresiva* | Estados de paquetes **o** Mis entregas |
| 10 | `RETENIDO_ADUANA` | Retenido en aduana | Alterno | Cambio manual masivo (1 paso) | Envíos consolidados → Aplicar estado a consolidados → Estado de rastreo de paquetes |

> Nota sobre la recepción en lote: al procesar un lote se aplican **dos** detonadores en
> secuencia sobre el mismo paquete — primero **Llega a destino** (`LLEGA_A_ADUANA`) y luego
> **Lote de recepción** (`EN_BODEGA`), que queda como estado actual.

> Nota sobre guías master: cuando al menos una pieza entra al estado configurado como
> **Sale de origen**, la guía master pasa a `EN_TRANSITO_USA_ECUADOR` hasta que alguna pieza
> sea recibida en bodega. Luego progresa a recepción parcial o completa según los conteos.

> Nota sobre consolidados: el estado visible del consolidado es **derivado** (no persistido):
> `VACIO`, `EN_PREPARACION`, `ENVIADO_DESDE_USA`, `RECIBIDO_EN_BODEGA` o `LIQUIDADO`.
> Prioridad: `LIQUIDADO` (pago) > `RECIBIDO_EN_BODEGA` (en lote) > `ENVIADO_DESDE_USA` (fecha salida) > `EN_PREPARACION` / `VACIO`.
> El bloqueo de edición se deriva de `fecha_cerrado` (salida USA), no de un enum `CERRADO`.

> Nota sobre guías master (estados globales v2):

| Estado | Cuándo aplica | Recalculado |
|--------|---------------|-------------|
| `SIN_PIEZAS_REGISTRADAS` | Sin piezas en el sistema | Sí |
| `EN_ESPERA_RECEPCION` | Piezas registradas, ninguna en bodega | Sí |
| `EN_TRANSITO_USA_ECUADOR` | Piezas en salida USA, ninguna recibida en bodega | Sí |
| `RECEPCION_PARCIAL` / `RECEPCION_COMPLETA` | Según conteo en bodega | Sí |
| `DESPACHO_PARCIAL` / `DESPACHO_COMPLETADO` / `DESPACHO_INCOMPLETO` | Según despacho de piezas | Parcial (terminales congelados) |
| `CANCELADA` / `EN_REVISION` | Acción manual del operario | No (congelado) |

---

## 3. Qué estados se ponen a mano y cuáles no

- **Reservados a un punto automático** (no se ofrecen para cambio manual): `REGISTRADO`,
  `PLANILLA`, `MANIFESTADO`, `VUELO`, `LLEGA_A_ADUANA`, `EN_BODEGA`, `TRABAJO`, `EN_TRANSITO`. Los aplica
  el flujo correspondiente.
- **Disponibles para cambio manual** (no atados a un punto): `RETENIDO_ADUANA` y, si no está
  reservado a un detonador, `ENTREGADO`. Se aplican desde **Envíos consolidados → Aplicar estado a
  consolidados → Estado de rastreo de paquetes**, con la regla de "ir de 1 en 1" (ver sección 5).
- **`ENTREGADO`** también puede aplicarse por **confirmación del cliente** en Mis entregas cuando
  está configurado el detonador de entrega confirmada.

Si un estado debiera aplicarse automáticamente, asígnalo a un detonador en **Parámetros → Estados por punto**.

---

## 4. Flujo Mis entregas y notificaciones

1. El paquete alcanza el estado de **aviso de confirmación** (prod: `EN_TRANSITO`).
2. El sistema envía push tipo `CONFIRMAR_ENTREGA` con CTA a `/mis-entregas`.
3. En **Mis entregas**, el cliente ve despachos con sus piezas. `confirmable=true` cuando el estado
   del paquete está entre el aviso y la entrega confirmada.
4. Al pulsar **Confirmar entrega**, se aplica el estado de **entrega confirmada** (prod: `ENTREGADO`)
   solo a las piezas del cliente en ese despacho. Se registra evento `ESTADO_CONFIRMADO_CLIENTE`.

Permisos: `MIS_ENTREGAS_READ`, `MIS_ENTREGAS_CONFIRM`, `MIS_ENTREGAS_EXPORT` (y variantes `ACCESO_ENLACE_*`).

---

## 5. Aplicar estado masivo a consolidados

Acción distinta de los detonadores por punto: en **Envíos consolidados → Aplicar estado**, el operario
elige consolidados y un estado **posterior al de asociación a consolidado**. El backend aplica ese
estado a todas las piezas de los consolidados seleccionados (`POST /api/envios-consolidados/aplicar-estado`).

No sustituye los hitos automáticos (registro, planilla, vuelo, etc.); sirve para correcciones o
avances operativos puntuales después de la asociación.

En la pestaña **"Estado de rastreo de paquetes"** se aplica además la regla de "ir de 1 en 1": al
seleccionar un estado, solo se listan los consolidados que tienen paquetes en el estado de rastreo
inmediatamente anterior (`GET /api/envios-consolidados/elegibles-para-estado-rastreo`). Para el estado
alterno `RETENIDO_ADUANA` (cuyo predecesor configurado es `LLEGA_A_ADUANA`), también se incluyen los
consolidados con `estadoOperativo = ARRIBADO_ECUADOR`.
