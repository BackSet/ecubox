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

## 2. Reglas por contexto

### UI y copy

- Usar tildes y pluralización natural: “Guías master”, “Envíos consolidados”, “Parámetros”.
- Usar “Rastreo” en copy; `tracking` se reserva para identificadores técnicos.
- En back-office usar “Consignatario”; en vista cliente usar “Destinatario”.
- “Pieza” describe pertenencia a una guía master; “Paquete” describe gestión individual.
- Diferenciar “Agencia” ECUBOX de “Punto de entrega” perteneciente a un courier.
- Mostrar los nombres de estados de rastreo recibidos desde configuración/API; no convertir nombres visibles actuales en constantes de negocio.
- Usar “Avanzar estados” o “Avance automático de estados” para la operación que aplica una secuencia completa; reservar “Aplicar estado” para una única transición heredada.
- Mostrar pesos con `lbs`.
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
| Paquete/pieza | `Paquete` | `paquete` | `/api/paquetes`, `/api/operario/paquetes` | `/paquetes`, `/pesaje` |
| Consignatario | `Consignatario` | `consignatario` | `/api/mis-consignatarios`, `/api/operario/consignatarios` | `/consignatarios` |
| Courier de entrega | `CourierEntrega` | `courier_entrega` | `/api/couriers-entrega` | `/couriers-entrega` |
| Punto de entrega | `AgenciaCourierEntrega` | `agencia_courier_entrega` | `/api/puntos-entrega` | `/puntos-entrega` |
| Agencia ECUBOX | `Agencia` | `agencia` | `/api/agencias` | `/agencias` |
| Envío consolidado | `EnvioConsolidado`, DTOs `AvanceEstadosConsolidados*` | `envio_consolidado` | `/api/envios-consolidados`; secuencia en `/preview-secuencia-estados` y `/aplicar-secuencia-estados` | `/envios-consolidados` |
| Lote de recepción | `LoteRecepcion` | `lote_recepcion` | `/api/operario/lotes-recepcion` | `/lotes-recepcion` |
| Despacho | `Despacho` | `despacho` | `/api/operario/despachos` | `/despachos` |
| Entrega del cliente | `Despacho` + DTOs `MiDespacho*` | `despacho` | `/api/mis-despachos` | `/mis-entregas` |
| Manifiesto | `Manifiesto` | `manifiesto` | `/api/manifiestos` | `/manifiestos` |
| Liquidación | `Liquidacion` | `liquidacion` | `/api/liquidaciones` | `/liquidaciones` |
| Estado de rastreo | `EstadoRastreo` | `estado_rastreo` | `/api/operario/estados-rastreo` | `/parametros-sistema/estados` |
| Rastreo público | `TrackingResolveResponse` | vistas/eventos de rastreo | `/api/tracking` | `/tracking` |
| Enlace de acceso | `AccesoEnlace`, `TipoAccesoEnlace` | `acceso_enlace` | `/api/acceso-enlaces`, `/api/auth/acceso-enlace` | `/enlaces-acceso`, `/acceso` |
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
