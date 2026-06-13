# Nomenclatura canónica de ECUBOX

> Este resumen prioriza vocabulario transversal. La fuente documental extensa es
> `docs/nomenclatura.md`; código y migraciones prevalecen cuando existe contradicción.

## 1. Términos del dominio

| Término canónico | Evitar | Contexto | Evidencia |
|---|---|---|---|
| ECUBOX | Variantes de marca | Producto, UI y documentación | **Verificado en Git** |
| Casillero | Oficina en USA, Agencia EEUU, bodega USA | Dirección USA asignada al cliente | **Verificado en documentación** y ruta `/casillero`; no es entidad propia |
| Guía master | Guia master, `GuiaMaster` en copy | Back-office; entidad agrupadora de piezas | **Verificado en Git**: `GuiaMaster`, `guia_master`, `/guias-master` |
| Guía | Guía master, cuando la vista cliente no requiere jerga | Vista cliente `/mis-guias` | **Verificado en documentación** y copy |
| Pieza | Paquete individual | Unidad dentro de una guía master | **Verificado en Git/documentación** |
| Paquete | Pieza, cuando se gestiona transversalmente | Entidad operativa individual | **Verificado en Git**: `Paquete`, `paquete`, `/paquetes` |
| Consignatario | Destinatario final, cliente | Operación y back-office | **Verificado en Git**: `Consignatario`, `consignatario` |
| Destinatario | Consignatario, cuando el copy debe ser amigable | Vista cliente y rastreo público | **Verificado en documentación** |
| Courier de entrega | Distribuidor, empresa de entrega | Empresa de última milla | **Verificado en Git**: `CourierEntrega`, `courier_entrega` |
| Punto de entrega | Agencia de distribuidor, agencia asociada | Sucursal de un courier de entrega | **Verificado en Git**: `AgenciaCourierEntrega`, endpoint `/puntos-entrega` |
| Agencia | Punto de entrega | Oficina propia ECUBOX | **Verificado en Git**: `Agencia`, `agencia` |
| Envío consolidado | Carga aérea como sinónimo | Agrupación que viaja USA -> Ecuador | **Verificado en Git** |
| Lote de recepción | Llegada, ingreso de mercancía | Registro agrupado de recepción en bodega | **Verificado en Git** |
| Despacho | Envío, cuando se refiere a la salida final registrada | Salida hacia destinatario | **Verificado en Git** |
| Retiro en oficina | "Pickup"; tratar "retiro presencial en agencia" como concepto distinto (es sinónimo en código) | Despacho `tipo_entrega = AGENCIA` con `agencia_id` informado y `courier_entrega_id` NULL; el número `RET-AG-*` se autogenera solo para despachos nuevos | **Verificado en Git**: `Despacho`, `DespachoService.resolverNumeroGuia`, migración V110 |
| Punto de retiro del courier | Retiro en agencia, punto de entrega cuando describe la modalidad | Despacho `tipo_entrega = AGENCIA_COURIER_ENTREGA`; la entidad sigue siendo `AgenciaCourierEntrega` | **Verificado en Git**: tracking público y `TipoEntrega` |
| Entrega a domicilio | Delivery, entrega domiciliaria | Despacho `tipo_entrega = DOMICILIO` | **Verificado en Git**: tracking público y `TipoEntrega` |
| Flujo alterno | Excepción como nombre genérico de estado | Estado público `tipo_flujo = ALTERNO`; solo aparece si ocurrió o es actual y conserva el avance del último estado base | **Verificado en Git**: `PaqueteService`, `TrackingEstadoItemDTO` |
| Cotización | "Presupuesto", "estimado" como sustantivo en copy | Resultado de la calculadora pública (`/calculadora`): copia, compartir y exportación PDF; no se persiste | **Verificado en Git**: `CalculadoraPage`, `lib/calculadora/cotizacion.ts` |
| Saca | Bolsa, contenedor genérico | Agrupación física usada en despacho | **Verificado en Git** |
| Manifiesto | Manifiesto de carga/aéreo sin necesidad | Documento operativo/aduanero | **Verificado en Git** |
| Liquidación | Pago, como nombre de la entidad | Cierre financiero de consolidados/despachos | **Verificado en Git** |
| Rastreo | Tracking, seguimiento en copy visible | Consulta de estado | **Verificado en documentación**; nombres técnicos `Tracking*` se conservan |
| Estado de rastreo | Estado de tracking en copy | Catálogo/evento visible | **Verificado en Git** |
| Paquete vencido | Retiro vencido | Paquete fuera del plazo de retiro | **Verificado en Git/documentación** |
| Pesaje | Cargar pesos, registro de peso | Proceso de capturar peso | **Verificado en Git** |
| Peso (lbs) | `lb` | Unidad visible y contratos de peso | **Verificado en documentación** y utilidades |
| Enlace de acceso | Link de acceso en copy canónico | Acceso sin cuenta, temporal o persistente | **Verificado en Git** |
| Número de guía | Guía master en copy de cliente | Código de rastreo del transportista que el cliente registra en `/mis-guias`; equivale al `trackingBase` | **Verificado en Git/documentación** |
| Número de rastreo | Tracking number / Tracking ID / Package tracking (sinónimos visibles) | Forma en que las tiendas (Amazon, SHEIN…) nombran el número de guía; es lo que el cliente debe copiar | **Verificado en documentación** |
| Número de pedido | Número de guía (es un error frecuente del cliente) | Identificador de la compra en la tienda (order number); **no** es la guía. Patrón Amazon `ddd-ddddddd-ddddddd`. También aplica número de factura, SKU, código de producto, referencia de pago | **Verificado en documentación** |
| Guía dividida en varios paquetes | Envío parcial como sinónimo de cliente | Cuando la tienda divide una compra y emite varios números de rastreo: cada uno se registra como una guía separada | **Verificado en documentación** |

## 2. Reglas por contexto

### UI y copy

- Usar tildes y pluralización natural: “Guías master”, “Envíos consolidados”, “Parámetros”.
- Usar “Rastreo” en copy; `tracking` se reserva para identificadores técnicos.
- En back-office usar “Consignatario”; en vista cliente usar “Destinatario”.
- “Pieza” describe pertenencia a una guía master; “Paquete” describe gestión individual.
- Diferenciar “Agencia” ECUBOX de “Punto de entrega” perteneciente a un courier.
- Mostrar los nombres de estados de rastreo recibidos desde configuración/API; no convertir nombres visibles actuales en constantes de negocio.
- En rastreo público distinguir **Retiro en oficina**, **Punto de retiro del courier**, **Entrega a domicilio** y **Flujo alterno**. No usar “Retiro en agencia” para la oficina propia ECUBOX.
- En «Aplicar estado» de envíos consolidados, los tres modos son términos canónicos: **«Transición operativa»** (una acción individual), **«Avance automático»** (un rango de acciones) y **«Estado de rastreo de paquetes»** (acción técnica sobre los paquetes).
- En Avance automático, **«Hasta»** identifica la transición operativa final; el inicio se deriva del estado operativo común de la selección. El tracking de paquetes es un efecto configurado de cada transición.
- Usar **«Estado aplicado a paquetes»** para el estado de rastreo asociado por configuración a una transición operativa.
- **«Estados por punto»**: estados de rastreo de paquetes configurables por hito en `/parametros-sistema/por-punto` (`EstadosRastreoPorPuntoDTO`: asociar a consolidado, lote de recepción, en despacho, etc.). El código nunca hardcodea estos estados; los resuelve por configuración.
- **«Estado anterior inmediato»**: regla de admisión por la que una entidad solo entra a un flujo si está EXACTAMENTE en el estado previo requerido. Para paquetes se resuelve con `EstadoRastreoService.resolverTransicionInmediata`; para consolidados, la recepción en bodega exige `ARRIBADO_ECUADOR` y los deja en `RECIBIDO_EN_BODEGA`.
- Mostrar pesos con `lbs`.
- **Movimiento (motion)**: tokens canónicos de duración `--motion-instant|fast|normal|slow|emphasis` y de curva `--motion-ease-standard|enter|exit|emphasized`; utilidades `.ui-transition`, `.ui-interactive`, `.ui-surface-hover`, `.ui-motion-enter`, `.ui-motion-fade`, `.ui-motion-scale`, `.ui-motion-slide-up`, `.ui-motion-highlight`. Prohibido `transition-all` y duraciones/curvas literales en componentes. Toda animación respeta `prefers-reduced-motion`. Referencia: `ecubox-frontend/UI_GUIDELINES.md`.
- **Estadísticas**: usar **«Periodo»** para el rango consultado (`[desde, hastaExclusivo)`, `hasta` exclusivo en el API; `hastaInclusivo` solo para mostrar). **«Preset»** es la selección rápida; **«Rango personalizado»** el modo manual; **«Granularidad»** la agregación temporal (diaria/semanal/mensual/trimestral). **«Periodo anterior equivalente»** es el rango contra el que se compara; **«Período en curso»** etiqueta un periodo parcial. **«Resultados del periodo»** (histórico, comparable) se separa de **«Estado operativo actual»** (fotografía, sin comparación histórica).
- **Métricas de estadísticas**:
  - **«Paquete registrado»**: paquete dado de alta en el sistema (por `paquete.created_at`). Métrica/serie **«Paquetes registrados»**.
  - **«Paquete despachado»**: paquete que avanzó a despacho; se ancla en su **primera transición auditable** al estado `estadoRastreoEnDespachoId` (`PaqueteEstadoEvento`), no en `despacho.fecha_hora`. Métrica/serie **«Paquetes despachados»**; el gráfico que las compara es **«Movimiento de paquetes»**. Ya **no** existe un KPI «Despachos» (conteo de entidades `despacho`).
  - **«Estimado/estimada»**: rótulo obligatorio para métricas que no son valores contables reales (**Margen bruto estimado**, **Costo de distribución estimado**, **Ingreso neto estimado**: peso registrado × tasas históricas de liquidación). No presentarlas como cifras contables.
  - **«Dato no disponible» / «—»**: representación de un valor **no calculable** (`null`), distinto de un **cero real** (`0`). No convertir nulos ni excepciones en cero.
- **Separación de lenguaje por audiencia (estados de guía)**: el vocabulario interno (operación/back-office) se separa del visible para el cliente. Cliente ve **Guía** (no «Guía master»), **Número de guía**, **Mis guías**, **Paquete** (no «Pieza»), **Envío** (nunca «Envío consolidado»/«consolidado»). El cliente no ve «Guía master», «Envío consolidado/consolidado», «Lote de recepción», «estado derivado», «recálculo automático» ni «admin/operario». Fuente única en código: `ecubox-frontend/src/lib/estados/guiaMasterEstados.ts` (catálogo `EstadoGuiaMaster` con etiqueta/descr. interna y de cliente; `describirEstadoCliente` expresa la parcialidad por cantidades, sin la palabra «parcial»). Las equivalencias se consultan en modo lectura en `/parametros-sistema/estados` («Equivalencias de estados para clientes»). El lenguaje interno se conserva intacto en paneles administrativos.
- Ejecutar `npm run lint:nomenclatura` al modificar copy del frontend.

### API/backend

- Clases Java en PascalCase; DTOs con sufijos `DTO`, `Request` o `Response`.
- Controllers usan rutas kebab-case y pluralizadas.
- Permisos son `UPPER_SNAKE_CASE`.
- Mantener nombres técnicos consolidados (`GuiaMaster`, `TrackingResolverService`) aunque el copy use tildes/español.
- No exponer entidades JPA directamente cuando el módulo ya usa DTO.
- En operaciones con vista previa mutable, llamar `previewToken` al token que vincula el cálculo mostrado con la aplicación atómica posterior.

### Base de datos

- Tablas y columnas en `snake_case` singular.
- Migraciones Flyway: `V<numero>__descripcion_en_snake_case.sql`.
- No reutilizar nombres históricos renombrados por V71-V73.
- No modificar migraciones históricas; cualquier cambio usa una nueva versión.

### Documentación

- Referenciar rutas exactas y distinguir endpoint real de nombre conceptual.
- No copiar versiones de dependencias sin verificarlas en manifiestos.
- Marcar inferencias y pendientes; no convertir nombres históricos en opciones vigentes.

## 3. Mapeo técnico

| Concepto | Entidad/tipo | Tabla principal | Endpoint base real | Ruta frontend |
|---|---|---|---|---|
| Guía master | `GuiaMaster` | `guia_master` | `/api/guias-master` | `/guias-master` |
| Guía del cliente | `GuiaMaster` + DTOs `MiGuia*` | `guia_master` | `/api/mis-guias` | `/mis-guias` |
| Paquete/pieza | `Paquete` | `paquete` | `/api/mis-paquetes`, `/api/operario/paquetes` | `/paquetes`, `/pesaje` |
| Revisión administrativa de paquete | `RevisionPaquete`, `EstadoRevisionPaquete`, `MotivoRevisionPaquete` | `revision_paquete` | `/api/mis-paquetes/{id}/revisiones` | `/paquetes?bandeja=en_revision` |
| Consignatario | `Consignatario` | `consignatario` | `/api/mis-consignatarios`, `/api/operario/consignatarios` | `/consignatarios` |
| Courier de entrega | `CourierEntrega` | `courier_entrega` | `/api/couriers-entrega` | `/couriers-entrega` |
| Punto de entrega | `AgenciaCourierEntrega` | `agencia_courier_entrega` | `/api/puntos-entrega` | `/puntos-entrega` |
| Agencia ECUBOX | `Agencia` | `agencia` | `/api/agencias` | `/agencias` |
| Envío consolidado | `EnvioConsolidado`; avance operativo DTOs `AvanceOperativoConsolidados*` / `DestinoAvanceOperativoDTO`; secuencia de rastreo (técnico) DTOs `AvanceEstadosConsolidados*` | `envio_consolidado` | `/api/envios-consolidados`; avance operativo en `/preview-avance-operativo` y `/aplicar-avance-operativo`; secuencia de rastreo en `/preview-secuencia-estados` y `/aplicar-secuencia-estados` | `/envios-consolidados` |
| Lote de recepción | `LoteRecepcion` | `lote_recepcion` | `/api/operario/lotes-recepcion` | `/lotes-recepcion` |
| Despacho | `Despacho` | `despacho` | `/api/operario/despachos` | `/despachos` |
| Entrega del cliente | `Despacho` + DTOs `MiDespacho*` | `despacho` | `/api/mis-despachos` | `/mis-entregas` |
| Manifiesto | `Manifiesto` | `manifiesto` | `/api/manifiestos` | `/manifiestos` |
| Liquidación | `Liquidacion` | `liquidacion` | `/api/liquidaciones` | `/liquidaciones` |
| Estado de rastreo | `EstadoRastreo` | `estado_rastreo` | `/api/operario/estados-rastreo` | `/parametros-sistema/estados` |
| Rastreo público | `TrackingResolveResponse` | vistas/eventos de rastreo | `/api/v1/tracking`; ejemplos en `/api/v1/tracking/examples` | `/tracking`, `/tracking/ejemplo` |
| Estadísticas | `EstadisticasDashboardDTO` (`resultados`/`estadoActual`, `MetricaComparable`, `SeriePunto`); `EstadisticasConsulta`, `PeriodoEstadisticasResolver`; enums `GranularidadEstadisticas`, `PresetPeriodoEstadisticas` | agregaciones sobre `despacho`/`paquete` (sin tabla propia) | `/api/estadisticas` | `/estadisticas` |
| Enlace de acceso | `AccesoEnlace`, `TipoAccesoEnlace`; código de negocio visible `codigo` con formato canónico `ACC-000001` (no editable, no reemplaza al token) | `acceso_enlace` | `/api/acceso-enlaces`, `/api/auth/acceso-enlace` | `/enlaces-acceso`, `/acceso` |
| Casillero | Sin entidad propia confirmada | Datos de usuario/parámetros | Configuración pública/perfil | `/casillero` |

## 4. Roles, permisos, enums y estados

### Roles y principal técnico

- `ADMIN`
- `OPERARIO`
- `CLIENTE`
- `ACCESO_ENLACE` es un rol/principal técnico de sesión limitada, no un rol de usuario normal confirmado.

### Familias de permisos

- Administración: `USUARIOS_*`, `ROLES_*`, `PERMISOS_READ`, `ACCESO_ENLACES_MANAGE`.
- Operación: `CONSIGNATARIOS_*`, `GUIAS_MASTER_*`, `PAQUETES_*`, `PAQUETES_OPERARIO`, `PAQUETES_PESO_WRITE`.
- Revisión de paquetes: `PAQUETES_REVISION_READ`, `PAQUETES_REVISION_CREATE`, `PAQUETES_REVISION_RESOLVE`.
- Logística: `ENVIOS_CONSOLIDADOS_*`, `LOTES_RECEPCION_*`, `DESPACHOS_WRITE`, `MANIFIESTOS_*`.
- Cliente/acceso: `MIS_GUIAS_*`, `MIS_ENTREGAS_*`, `ACCESO_ENLACE_*`, `CASILLERO_READ`.
- Catálogos: `COURIERS_ENTREGA_*`, `AGENCIAS_*`, `PUNTOS_ENTREGA_*`.
- Configuración: `PARAMETROS_SISTEMA_READ`, `ESTADOS_RASTREO_*`, `TARIFA_CALCULADORA_*`, `CONFIG_TARIFA_DISTRIBUCION_*`, mensajes/canales/temporada.
- Observabilidad: `ESTADISTICAS_READ`, `TRACKING_PROJECTOR_HEALTH_READ`.

No asumir que existe una operación por el sufijo `*`; usar solo códigos presentes en controllers/migraciones.

### Estados canónicos de guía master

`PENDIENTE_VERIFICACION`, `VERIFICADA`, `EN_REVISION`,
`SIN_PAQUETES_REGISTRADOS`, `CON_PAQUETES_REGISTRADOS`, `ENVIO_PARCIAL`,
`ENVIO_COMPLETO`, `RECEPCION_PARCIAL`, `RECEPCION_COMPLETA`,
`DESPACHO_PARCIAL`, `DESPACHO_COMPLETADO`, `CANCELADA`.

#### Etiquetas internas vs. etiquetas de cliente (estados de guía master)

Sinonimia canónica (parcial y completo comparten etiqueta de cliente; la diferencia se expresa por cantidades de paquetes). Fuente única: `src/lib/estados/guiaMasterEstados.ts`.

| Estado técnico | Etiqueta interna | Etiqueta cliente |
|---|---|---|
| `PENDIENTE_VERIFICACION` | Pendiente de verificación | Pendiente de verificación |
| `VERIFICADA` | Verificada | Guía verificada |
| `EN_REVISION` | En revisión | En revisión |
| `SIN_PAQUETES_REGISTRADOS` | Sin paquetes registrados | Sin paquetes registrados |
| `CON_PAQUETES_REGISTRADOS` | Con paquetes registrados | En preparación |
| `ENVIO_PARCIAL` | Envío parcial | En camino a Ecuador |
| `ENVIO_COMPLETO` | Envío completo | En camino a Ecuador |
| `RECEPCION_PARCIAL` | Recepción parcial | En bodega |
| `RECEPCION_COMPLETA` | Recepción completa | En bodega |
| `DESPACHO_PARCIAL` | Despacho parcial | En camino al destino |
| `DESPACHO_COMPLETADO` | Despacho completado | Entregada |
| `CANCELADA` | Cancelada | Cancelada |

### Estados del envío consolidado

`VACIO`, `EN_PREPARACION`, `CERRADO`, `ENVIADO_DESDE_USA`,
`ARRIBADO_ECUADOR`, `RECIBIDO_EN_BODEGA`, `LIQUIDADO`, `CANCELADO`.

### Otros enums relevantes

- Pago: `NO_PAGADO`, `PAGADO`.
- Entrega: `DOMICILIO`, `AGENCIA`, `AGENCIA_COURIER_ENTREGA`.
- Acceso: `PERSISTENTE`, `TEMPORAL`.
- Rastreo resoluble: `PIEZA`, `GUIA_MASTER`.
- Flujo de estado: `NORMAL`, `ALTERNO`.
- Outbox: `PENDING`, `SENT`, `FAILED`.
- Granularidad de estadísticas (`GranularidadEstadisticas`): `DIARIA`, `SEMANAL`, `MENSUAL`, `TRIMESTRAL`.
- Preset de periodo de estadísticas (`PresetPeriodoEstadisticas`): `ESTE_MES`, `MES_ANTERIOR`, `MES_ESPECIFICO`, `ULTIMOS_3_MESES`, `ULTIMOS_6_MESES`, `ULTIMOS_12_MESES`, `ULTIMOS_24_MESES`, `ESTE_ANIO`, `ANIO_ANTERIOR`, `RANGO_PERSONALIZADO`.
- Revisión de paquete: `EN_REVISION`, `RESUELTA`.
- Motivo de revisión de paquete: `DATOS_INCONSISTENTES`, `PESO_O_DIMENSIONES`, `CONSIGNATARIO_INCORRECTO`, `GUIA_INCORRECTA`, `CONTENIDO_RESTRINGIDO`, `OTRO`.

### Revisión y bandejas

- **Revisión administrativa de paquete**: proceso histórico e independiente del estado logístico.
- **Revisión activa**: revisión `EN_REVISION`; bloquea operaciones logísticas normales, no consulta ni corrección.
- **Revisión resuelta**: registro histórico `RESUELTA`; no reconstruye ni cambia el estado logístico.
- **Bandeja de trabajo**: separación entre consulta global, operación normal y atención especializada.
- En `/paquetes`, los nombres visibles son **Todos**, **Operativos** y **En revisión**; sus valores API son `todos`, `operativos`, `en_revision`.

## 5. Nombres históricos que no deben reaparecer

**Verificado en Git** por migraciones V71, V72 y V73:

| Histórico | Canónico actual |
|---|---|
| `distribuidor` / `Distribuidor` | `courier_entrega` / `CourierEntrega` |
| `destinatario_final` / `DestinatarioFinal` | `consignatario` / `Consignatario` |
| `agencia_distribuidor` | `agencia_courier_entrega` |
| `DISTRIBUIDORES_*` | `COURIERS_ENTREGA_*` |
| `DESTINATARIOS_*` | `CONSIGNATARIOS_*` |
| `AGENCIAS_DISTRIBUIDOR_*` | `PUNTOS_ENTREGA_*` |
| `AGENCIA_DISTRIBUIDOR` | `AGENCIA_COURIER_ENTREGA` |
| Ruta UI `/cargar-pesos` | `/pesaje` (la ruta antigua solo redirige) |
| Ruta UI `/agencia-eeuu` | `/casillero` (la ruta antigua solo redirige) |

## 6. Contradicciones y pendientes

- `docs/nomenclatura.md` declara endpoints conceptuales que no siempre coinciden con controllers actuales; usar la tabla de este archivo.
- El glosario documental sugiere que el casillero vive en datos de usuario, pero el código actual también consume parámetros públicos de dirección/mensaje. El modelo exacto debe verificarse al tocar ese flujo.
- “Agencia” aparece en dominio propio ECUBOX y en nombres técnicos históricos de puntos de entrega; el copy debe mantener la distinción.
- **Pendiente de confirmar**: términos comerciales definitivos para liquidación y tarifas en material externo; el código solo confirma nombres técnicos actuales.
