# Auditoría de Ciclos de Estado - ECUBOX

Este documento describe de forma exhaustiva los ciclos de vida, transiciones, detonantes, restricciones, efectos y eventos de las tres entidades logísticas clave de ECUBOX: **Envíos Consolidados**, **Guías Master** y **Paquetes**.

---

## 1. Ciclo de Envíos Consolidados (`EnvioConsolidado`)

El estado operativo del consolidado se gestiona a través de la propiedad `estadoOperativo` (`envio_consolidado.estado_operativo`) y se resuelve de forma centralizada con el resolver `calcularEstadoOperativoConsolidado(...)`.

### Ciclo de vida y transiciones

| Estado Origen | Estado Destino | Detonante | Restricciones | Efecto en Paquetes | Efecto en Guías Master | Evento (`TrackingEventType`) | Permisos |
|---|---|---|---|---|---|---|---|
| `-` (Nuevo) | `VACIO` | Creación del consolidado sin paquetes. | Ninguna. | Ninguno. | Ninguno. | Ninguno. | `ENVIOS_CONSOLIDADOS_WRITE` |
| `VACIO` / `EN_PREPARACION` | `EN_PREPARACION` | Adición de al menos 1 paquete. | No estar cerrado o en tránsito. | Asocia FK `envio_consolidado_id`. | Recalcula estados a `ENVIO_PARCIAL` / `ENVIO_COMPLETO`. | `ESTADO_APLICADO_ASOCIAR_ENVIO_CONSOLIDADO` (En planilla) | `ENVIOS_CONSOLIDADOS_WRITE` |
| `EN_PREPARACION` | `CERRADO` | Aplicar transición "Cerrar". | Tener paquetes; estar en `EN_PREPARACION`. | Avanzan al estado configurado en `estadoRastreoCierreConsolidadoId` ("Manifestado"). | Recalcula estados globales de guía. | `ESTADO_APLICADO_CIERRE_CONSOLIDADO` | `ENVIOS_CONSOLIDADOS_UPDATE` |
| `CERRADO` | `ENVIADO_DESDE_USA` | Aplicar transición "Enviar desde USA". | Estar en `CERRADO`. | Avanzan a `estadoRastreoEnviadoDesdeUsaId` ("En vuelo a Ecuador"). | Recalcula estados globales de guía. | `ESTADO_APLICADO_ENVIADO_USA` | `ENVIOS_CONSOLIDADOS_UPDATE` |
| `ENVIADO_DESDE_USA` | `ARRIBADO_ECUADOR` | Aplicar transición "Registrar Arribo". | Estar en `ENVIADO_DESDE_USA`. | Avanzan a `estadoRastreoArriboEcuadorId` ("Llega a aduana destino"). | Recalcula estados globales de guía. | `ESTADO_APLICADO_ARRIBO_ECUADOR` | `ENVIOS_CONSOLIDADOS_UPDATE` |
| `ARRIBADO_ECUADOR` | `RECIBIDO_EN_BODEGA` | Lote de recepción (ingreso a bodega). | Estar en `ARRIBADO_ECUADOR`. | Avanzan a `estadoRastreoEnLoteRecepcionId` ("Llega a bodega Quito"). | Recalcula a `RECEPCION_PARCIAL` / `RECEPCION_COMPLETA`. | `ESTADO_APLICADO_LOTE_RECEPCION` | `LOTES_RECEPCION_WRITE` |
| `CERRADO` / `ENVIADO_DESDE_USA` | `EN_PREPARACION` | Operación "Reabrir consolidado". | No pertenecer a liquidación pagada. | Revierte el estado de los paquetes al estado inmediato anterior. | Recalcula estados globales de guía. | Reversión de eventos anteriores. | `ENVIOS_CONSOLIDADOS_UPDATE` |
| Cualquier estado salvo `LIQUIDADO` / `CANCELADO` | `CANCELADO` | Operación "Cancelar consolidado". | No estar en `LIQUIDADO` o `CANCELADO`. | Ninguno directo (mantiene trazabilidad). | Recalcula estados globales de guía. | Ninguno. | `ENVIOS_CONSOLIDADOS_UPDATE` |
| `RECIBIDO_EN_BODEGA` | `LIQUIDADO` | Facturación/pago del consolidado. | Completar el proceso de cobro. | Ninguno directo. | Ninguno. | Ninguno. | `LIQUIDACIONES_WRITE` |

---

## 2. Ciclo de Guías Master (`GuiaMaster`)

El estado de la guía master es calculado dinámicamente en cascada a través de `recalcularEstadoGuia(...)` y se basa en la disponibilidad y estado de sus piezas/paquetes.

### Detonantes y condiciones exactas de recálculo

| Estado Técnico | Detonante | Condiciones exactas | Paquetes incluidos / excluidos | Prioridad frente a revisión y cancelación | Servicio que calcula | Puntos donde se recalcula | Tests existentes |
|---|---|---|---|---|---|---|---|
| `PENDIENTE_VERIFICACION` | Creación manual de guía. | Estado inicial por defecto. | Paquetes no requeridos. | Bloquea el flujo logístico normal. | `GuiaMasterService` | Creación. | `GuiaMasterServiceTest` |
| `VERIFICADA` | Aprobación por operario. | Transición transitoria que se recalcula inmediatamente. | Paquetes no requeridos. | Transitorio. | `GuiaMasterService` | `aprobar(...)` | `GuiaMasterServiceTest` |
| `EN_REVISION` | Pausa administrativa. | Activada con motivo obligatorio. | Conserva estados pero bloquea modificaciones. | Congela estado global; prevalece sobre auto-recálculos. | `GuiaMasterService` | `marcarEnRevision(...)` | `GuiaMasterServiceTest` |
| `SIN_PAQUETES_REGISTRADOS` | Aprobación / Reapertura. | Guía verificada sin paquetes asignados. | 0 paquetes registrados. | Baja prioridad. | `GuiaMasterService` | `recomputarEstado(...)` | `GuiaMasterServiceTest` |
| `CON_PAQUETES_REGISTRADOS` | Asignación de piezas. | Al menos 1 paquete asignado, ninguno en consolidado. | Todos los paquetes en estado "Registrado". | Baja prioridad. | `GuiaMasterService` | `propagarDestinatarioAPiezas(...)` | `GuiaMasterServiceTest` |
| `ENVIO_PARCIAL` | Asociación parcial a consolidado. | `0 < enConsolidado < totalEsperadas`. | Paquetes en consolidado. | Media prioridad. | `GuiaMasterService` | `recomputarEstado(...)` | `GuiaMasterServiceTest` |
| `ENVIO_COMPLETO` | Asociación total a consolidado. | `enConsolidado >= totalEsperadas`. | Paquetes en consolidado. | Media prioridad. | `GuiaMasterService` | `recomputarEstado(...)` | `GuiaMasterServiceTest` |
| `RECEPCION_PARCIAL` | Recepción parcial en bodega. | `0 < enRecepcion < totalEsperadas`. | Paquetes en lote de recepción. | Media-alta prioridad. | `GuiaMasterService` | `recomputarEstado(...)` | `GuiaMasterServiceTest` |
| `RECEPCION_COMPLETA` | Recepción total en bodega. | `enRecepcion >= totalEsperadas`. | Paquetes en lote de recepción. | Media-alta prioridad. | `GuiaMasterService` | `recomputarEstado(...)` | `GuiaMasterServiceTest` |
| `DESPACHO_PARCIAL` | Despacho parcial de piezas. | `0 < despachadas < totalEsperadas`. | Paquetes en saca/despacho. | Alta prioridad. | `GuiaMasterService` | `recomputarEstado(...)` | `GuiaMasterServiceTest` |
| `DESPACHO_COMPLETADO` | Despacho total de piezas. | `despachadas >= totalEsperadas`. | Todos los paquetes despachados. | Terminal; congela la guía. | `GuiaMasterService` | `recomputarEstado(...)` | `GuiaMasterServiceTest` |
| `CANCELADA` | Cierre con faltantes / cancelación. | Acción manual del operario con motivo. | Paquetes cancelados o cerrados con faltantes. | Terminal; prevalece sobre auto-recálculos. | `GuiaMasterService` | `cancelar(...)`, `cerrarConFaltante(...)` | `GuiaMasterServiceTest` |

---

## 3. Puntos Configurables de Paquete (`Paquete`)

Las propiedades configuradas en **Parámetros del sistema** (`EstadosRastreoPorPuntoDTO`) se corresponden con las siguientes propiedades del paquete:

* **Paquete registrado:** `estadoRastreoRegistroPaqueteId` (Registrado).
* **En planilla:** `estadoRastreoAsociarEnvioConsolidadoId` (Asociado a Consolidado).
* **Manifestado:** `estadoRastreoCierreConsolidadoId` o `estadoRastreoAsociarGuiaMasterId` (Cierre de Consolidado).
* **En vuelo a Ecuador:** `estadoRastreoEnviadoDesdeUsaId` (Consolidado Enviado).
* **Llega a aduana destino:** `estadoRastreoArriboEcuadorId` o `estadoRastreoArribadoEcId` (Arribo Consolidado).
* **Llega a bodega Quito:** `estadoRastreoEnLoteRecepcionId` (Confirmación en Lote de Recepción).
* **Preparando envío:** `estadoRastreoEnDespachoId` (Creación de Despacho).
* **En tránsito a destino:** `estadoRastreoEnTransitoId` (Avance de Despacho).
* **Entregado a destinatario:** `estadoRastreoEntregaConfirmadaClienteId` (Confirmación del Cliente).

### Reglas funcionales transversales
* **Retenido en aduana:** Identificado por un estado cuyo `tipoFlujo = ALTERNO` o con código conteniendo `RETENIDO` (ej. `RETENIDO_ADUANA`).
* **Estado que dispara notificación:** `estadoRastreoAvisoConfirmacionEntregaId` (Dispara push de confirmación).
* **Estado al confirmar recepción:** `estadoRastreoEntregaConfirmadaClienteId`.
* **Inicio de cuenta regresiva:** `estadoRastreoInicioCuentaRegresivaId`.
* **Fin de cuenta regresiva:** `estadoRastreoFinCuentaRegresivaId`.

---

## 4. Motor Canónico de Estados

El motor de estados centraliza el cálculo operativo y de rastreo de las tres entidades principales a través de funciones únicas para garantizar que no existan inconsistencias históricas o degradación de estados:

### 1. `resolveEstadoOperativoConsolidado(...)` / `calcularEstadoOperativoConsolidado(...)`
* **Definición:** `EstadoConsolidadoOperativoResolver.resolve(EnvioConsolidado, long)`
* **Objetivo:** Determina el estado del consolidado (`VACIO` $\rightarrow$ `EN_PREPARACION` $\rightarrow$ `CERRADO` $\rightarrow$ `ENVIADO_DESDE_USA` $\rightarrow$ `ARRIBADO_ECUADOR` $\rightarrow$ `RECIBIDO_EN_BODEGA` $\rightarrow$ `LIQUIDADO` / `CANCELADO`).

### 2. `calcularEstadoMinimoPaquete(...)`
* **Definición:** `PaqueteService.calcularEstadoMinimoPaquete(Paquete)`
* **Objetivo:** Calcula el estado al que el paquete pertenece según sus relaciones directas ordenadas por prioridad decreciente:
  1. **entrega** (confirmada por cliente/operario)
  2. **despacho** (asociado a saca en despacho)
  3. **lote de recepción** (código de guía o consolidado presente en `lote_recepcion_guia`)
  4. **estado avanzado del consolidado** (consolidado en `ARRIBADO_ECUADOR`, `ENVIADO_DESDE_USA` o `CERRADO`)
  5. **asociación inicial al consolidado** (consolidado en `EN_PREPARACION` o planilla)
  6. **registro** (estado base de registro)
* **Reglas de prevención de degradación y exclusión:**
  * Si el paquete tiene un **estado especial** (está bloqueado, en revisión administrativa activa, en flujo alterno/retenido, o es devuelto/cancelado/terminal), se retorna intacto.
  * Si el estado calculado representa una **degradación** (su orden es menor al del estado actual del paquete), se retorna el estado actual.

### 3. `recalcularEstadoGuia(...)`
* **Definición:** `GuiaMasterService.recomputarEstado(Long)`
* **Objetivo:** Ejecuta el agregador de la guía master basado en el avance real e inmutable de sus piezas, resolviendo las transiciones de forma idempotente y segura.
