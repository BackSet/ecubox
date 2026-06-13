# Mapa canónico de módulos ECUBOX

> Fuente funcional: rama `dev`, commit `adac693` más cambios locales descritos en este documento.
> Salvo indicación contraria, las rutas y clases de este documento están **verificadas en Git**.

## 1. Inventario funcional

| Módulo | Frontend | API/controladores | Backend y persistencia | Permisos principales | Tests directos |
|---|---|---|---|---|---|
| Sitio público y legal | `/`, `/terminos`, `/privacidad`, `/enlaces` en `src/pages/home`, `legal`, `enlaces` | Configuración pública en `ConfigPublicController` | `ParametroSistemaService/Repository`, `parametro_sistema` | Público según `SecurityConfig` | `seasons.test.ts`, pruebas PWA/tema |
| Autenticación, perfil y registro | `/login`, `/registro`, `/perfil`; `authStore`, `auth.service.ts` | `/api/auth`; `AuthController` | `UsuarioService`, `JwtService`, `UsuarioRepository`; `usuario`, `rol`, `permiso` | `PERFIL_READ`, `PERFIL_UPDATE`; login/registro simple públicos | `LoginRequestValidationTest`, `JwtServiceTest` |
| Usuarios, roles y permisos | `/usuarios`, `/roles`, `/permisos` | `UsuarioController`, `RolController`, `PermisoController` | Services/repositories homónimos; `usuario`, `rol`, `permiso`, uniones de seguridad | `USUARIOS_*`, `ROLES_*`, `PERMISOS_READ` | Sin test directo localizado |
| Enlaces de acceso | `/enlaces-acceso`, `/acceso`; `useAccesoEnlaces` | `/api/acceso-enlaces`, `/api/auth/acceso-enlace`; `AccesoEnlaceController`, `AuthController` | `AccesoEnlaceService/Repository`, `AccesoSessionResolver`, `CodigoSecuenciaService`; `acceso_enlace` (incluye `codigo` ACC-NNNNNN, identificador de negocio visible/único, no autentica), relación con consignatarios | `ACCESO_ENLACES_MANAGE` y permisos `ACCESO_ENLACE_*` | `AccesoEnlaceServiceTest`, `EnlacesAccesoPage.test.tsx` |
| Consignatarios/destinatarios | `/consignatarios`; `useConsignatarios` | `/api/mis-consignatarios`, `/api/operario/consignatarios` | `ConsignatarioService`, versionado SCD2 y repositorios; `consignatario`, `consignatario_version` | `CONSIGNATARIOS_*`, `CONSIGNATARIOS_OPERARIO`, acceso por enlace | Cubierto indirectamente en servicios de guías/paquetes |
| Guías master y Mis guías | `/guias-master`, `/guias-master/$id`, `/mis-guias`, `/mis-guias/$id`; hooks `useGuiasMaster`, `useMisGuias`; diálogos masivos de selección, motivo y resultado | `/api/guias-master`, `POST /api/guias-master/aplicar-accion`, `/api/mis-guias`; `GuiaMasterController`, `MisGuiasController` | `GuiaMasterService`, DTOs `AplicarAccionGuiasMaster*`, historial/repositories; `guia_master`, `guia_master_estado_historial` | `GUIAS_MASTER_*`, `MIS_GUIAS_*`, `ACCESO_ENLACE_GUIAS_READ`; el bulk usa `GUIAS_MASTER_UPDATE` | `GuiaMasterServiceTest`, `PaqueteServiceOp3Test`, `guiaAdmiteRegistroDePiezas.test.ts`, `AplicarEstadoMasivoDialog.test.tsx`, `ResultadoBulkDialog.test.tsx` |
| Paquetes, revisión administrativa, pesaje y vencidos | `/paquetes` con bandejas `Todos`, `Operativos`, `En revisión`; `/pesaje`, `/paquetes-vencidos`; hooks `usePaquetes`, `usePaquetesOperario`; `RevisionPaqueteDialog` | `/api/mis-paquetes`, `/api/mis-paquetes/{id}/revisiones`, `/api/operario/paquetes`; `PaqueteController`, `RevisionPaqueteController`, `OperarioPaqueteController` | `PaqueteService`, `RevisionPaqueteService`, `PaqueteOperacionValidator`; `paquete`, `revision_paquete`, `paquete_estado_evento`, vista de rastreo | `PAQUETES_*`, `PAQUETES_OPERARIO`, `PAQUETES_PESO_WRITE`, `PAQUETES_REVISION_READ`, `PAQUETES_REVISION_CREATE`, `PAQUETES_REVISION_RESOLVE` | `PaqueteTest`, suites `PaqueteService*`, `RevisionPaqueteServiceTest`, `PaqueteOperacionValidatorTest`, `paquetes.service.test.ts`, utilidades de peso |
| Estados de rastreo | sección `/parametros-sistema/estados` y `/por-punto`; `useEstadosRastreo` | `/api/operario/estados-rastreo`, `/api/operario/config/estados-rastreo-por-punto` | `EstadoRastreoService.findCatalogoPublicoEntities` compone el catálogo público activo: bases por `ordenTracking` y alternos insertados por `afterEstado`; `estado_rastreo`, transiciones y parámetros | `ESTADOS_RASTREO_*` | `EstadoRastreoServiceTest`, `ParametroSistemaServiceEstadosManualesTest`, diálogo de leyenda |
| Envíos consolidados | `/envios-consolidados`, detalle; `useEnviosConsolidados`, `AplicarEstadoConsolidadosMenuDialog`, `AvanceEstadosConsolidadosDialog` | `/api/envios-consolidados`; catálogo en `/transiciones-operativas`, preview en `/preview-secuencia-estados` y aplicación en `/aplicar-secuencia-estados`; se conservan los contratos operativos anteriores `/destinos-avance-operativo`, `/preview-avance-operativo` y `/aplicar-avance-operativo`; `EnvioConsolidadoController` | `EnvioConsolidadoService` compone el catálogo canónico desde el enum operativo y los estados por punto; `PaqueteService` registra eventos por transición; `envio_consolidado`, `paquete`, `paquete_estado_evento` | `ENVIOS_CONSOLIDADOS_*`; catálogo, preview y avance usan `ENVIOS_CONSOLIDADOS_UPDATE` | `EnvioConsolidadoServiceTest`, `AvanceEstadosConsolidadosDialog.test.tsx`, `EstadoConsolidadoOperativoResolverTest` |
| Lotes de recepción | `/lotes-recepcion`, nuevo y detalle; `useLotesRecepcion`, `useEnviosDisponiblesParaRecepcion` | `/api/operario/lotes-recepcion`; `OperarioLoteRecepcionController`; disponibles vía `/api/envios-consolidados/disponibles-recepcion` (solo `ARRIBADO_ECUADOR`) | `LoteRecepcionService` (admite solo `ARRIBADO_ECUADOR`, marca `RECIBIDO_EN_BODEGA`), `EnvioConsolidadoRepository.findDisponiblesParaRecepcion`; `lote_recepcion`, `lote_recepcion_guia` | `LOTES_RECEPCION_READ/CREATE/DELETE` | `LoteRecepcionServiceTest` |
| Despachos, sacas y Mis entregas | `/despachos`, alta/detalle/edición; `/mis-entregas`; hooks operario/cliente | `/api/operario/despachos`, `/api/operario/despachos/sacas-elegibles`, `/api/operario/sacas`, `/api/mis-despachos` | `DespachoService`, `SacaService`, `EstadoRastreoService`, `MisDespachosService`; `despacho`, `saca`, `paquete` | `DESPACHOS_WRITE`, `MIS_ENTREGAS_*`, acceso por enlace | `DespachoServiceTest`, `EstadoRastreoServiceTest`, distribución de sacas frontend |
| Manifiestos | `/manifiestos`, detalle; `useManifiestos` | `/api/manifiestos`; `ManifiestoController` | `ManifiestoService/Repository`; `manifiesto`; asigna despachos | `MANIFIESTOS_READ/WRITE` | Sin test directo localizado |
| Liquidaciones | `/liquidaciones`, detalle; `useLiquidacion` | `/api/liquidaciones`; `LiquidacionController` | `LiquidacionService`, `LiquidacionExportService`; `liquidacion` y líneas de consolidado/despacho | `LIQUIDACION_CONSOLIDADO_READ/WRITE` | Sin test directo localizado |
| Red de entrega | `/couriers-entrega`, `/agencias`, `/puntos-entrega`; hooks admin | Controllers de courier, agencia y puntos; variantes `/api/operario/*` | Services/repositories + versiones SCD2; `courier_entrega`, `agencia`, `agencia_courier_entrega` y tablas versionadas | `COURIERS_ENTREGA_*`, `AGENCIAS_*`, `PUNTOS_ENTREGA_*`; operario usa `DESPACHOS_WRITE` en consultas seleccionadas | Sin test directo localizado |
| Rastreo público | `/tracking`, `/tracking/ejemplo`; `tracking.service.ts`, `TrackingSamplePage`, componentes compartidos de pantalla/PDF/imagen | `GET /api/v1/tracking`, `GET /api/v1/tracking/examples`, `GET /api/v1/tracking/examples/{codigo}`; `TrackingController`, health de proyector | `TrackingResolverService`, `TrackingExampleService` (solo catálogo/configuración + datos ficticios), catálogo público de `EstadoRastreoService`, eventos/outbox/proyector; alternos ocurridos por `paquete_estado_evento`; retiro en oficina por `tipoEntrega=AGENCIA` + agencia | Público con rate limit; health interno con `TRACKING_PROJECTOR_HEALTH_READ` | `TrackingExampleServiceTest`, `PaqueteServiceTimelineTest`, `PaqueteServiceOp3Test`, `TrackingControllerCacheTest`, `TrackingEtagTest`, tests de API/página/progreso/entrega frontend |
| Exportación a imagen/PDF-captura (cross-cutting) | `lib/exporters/domSnapshot.ts` (html-to-image) usado por Rastreo y calculadora | — | — | — | **Nota**: las capturas usan `skipFonts: true` y `cacheBust: false`; embeber la fuente `Inter` (cross-origin Google Fonts) generaba imágenes en blanco |
| Notificaciones y Web Push | `NotificationBell`, `useNotificaciones`, `useWebPush`, service worker | `/api/notificaciones`, `/api/push`; controllers homónimos | `NotificacionService`, `WebPushService`; `notificacion_usuario`, `web_push_subscription` | Usuario autenticado; exposición puntual de clave pública | Pruebas PWA; sin test backend directo localizado |
| Estadísticas | `/estadisticas` (selector de periodo + URL como fuente de verdad vía `validateSearch`); `useEstadisticas`, `PeriodSelector`, `periodo.ts`, `SeriesChart`/`StatusDistributionChart` | `/api/estadisticas`; `EstadisticasController` | `EstadisticasService`, `PeriodoEstadisticasResolver`, `EstadisticasExcepcionRepository` y consultas agregadas parametrizadas por granularidad | `ESTADISTICAS_READ` | `EstadisticasServiceTest`, `PeriodoEstadisticasResolverTest`, `EstadisticasCharts.test.tsx`, `periodo.test.ts` |
| Parámetros y calculadoras | `/calculadora` (panel "Compartir y exportar" con paridad a Rastreo: copiar, compartir [Web Share con archivo PDF y fallback a portapapeles], PDF documento/captura, imagen PNG/JPEG/portapapeles, imprimir; modelo común `lib/calculadora/cotizacion.ts`, builder `lib/pdf/builders/cotizacionPdf.ts`, hook `useCotizacionExport`, panel `CalculadoraActionsBar`; sin backend), `/tarifa-calculadora`, `/parametros-sistema/$seccion` | `/api/config/*`, `/api/operario/config/*`, tarifa de distribución | `ParametroSistemaService`, `ConfigCalculadoraService`, `ConfigTarifaDistribucionService`; tablas de configuración | `PARAMETROS_SISTEMA_READ`, permisos por sección | Pruebas de parámetros/estados, esquemas frontend y `lib/calculadora/*.test.ts` |
| Casillero | `/casillero`; sección de parámetros de casillero | Config pública `mensaje-agencia-eeuu`; no hay `CasilleroController` | Datos presentados desde parámetros y perfil; no existe entidad `Casillero` | `CASILLERO_READ`, `MENSAJE_AGENCIA_EEUU_*` | Sin test directo localizado |

## 2. Capas técnicas compartidas

| Área | Rutas |
|---|---|
| Seguridad | Backend `config/SecurityConfig.java`, filtros JWT/rate limit, `security/`; frontend `authStore.ts`, guards del router |
| Errores | Backend `exception/`; frontend `lib/api/error-message.ts`, interceptor Axios, estados de error de página |
| Paginación/búsqueda | `PageResponse`, `Pageables`, `SearchSpecifications`, `useSearchPagination`, `createCrudQueryHooks` |
| Diseño y movimiento | Frontend `src/index.css` (tokens de color/radio/**motion** + utilidades `.ui-transition`, `.ui-interactive`, `.ui-surface-hover`, `.ui-motion-*`, todas con `prefers-reduced-motion`); guía `ecubox-frontend/UI_GUIDELINES.md`; consumidas por `Button`, `Input`, `Switch`, `Table`, `ChipFiltro`, `KpiCard` y demás componentes compartidos |
| Responsive | Estándar en `UI_GUIDELINES.md` §5.5. Controles compartidos endurecidos: `ui/select.tsx` (`SelectTrigger` `min-w-0 max-w-full` + valor truncable; `SelectContent` `max-w-[calc(100vw-2rem)]`), `ui/searchable-combobox.tsx` (trigger/valor `min-w-0`; popover acotado al viewport). `EstadosRastreoPorPuntoView` (`PuntoCard`) en `ParametrosSistemaPage.tsx` apila info+selector y usa `min-w-0` en el grid item |
| Exportación | Frontend `lib/pdf`, `lib/xlsx`, `lib/exporters`; backend exportadores de consolidado/liquidación |
| Observabilidad | Health, Micrometer, logs, health del proyector, ETag |
| PWA | `vite.config.ts`, `src/sw.ts`, hooks PWA/Web Push, manifest e iconos |
| Configuración | `application*.properties`, `.env.example`, Vite, Caddy, Docker, Railway |

## 3. Dependencias entre módulos

- Usuario/roles/permisos habilitan todos los módulos privados.
- Enlaces de acceso crean sesiones limitadas para Mis guías, Mis entregas, consignatarios y casillero.
- Una guía master agrupa piezas persistidas como `Paquete` y se vincula a un consignatario.
- Paquetes y guías master alimentan envíos consolidados.
- `RevisionPaquete` conserva el historial administrativo sin modificar el estado de rastreo. Solo puede existir una fila `EN_REVISION` por paquete.
- El lote de recepción registra llegada y actualiza el avance de consolidado, guía y rastreo.
- Despachos agrupan paquetes directamente o mediante sacas y dependen de la red de entrega.
- Manifiestos agrupan despachos; los manifiestos de envío consolidado se generan también desde el módulo de consolidados.
- Liquidaciones referencian envíos consolidados y despachos.
- Cambios operativos producen eventos de rastreo, outbox, vistas proyectadas y notificaciones.
- Estadísticas agrega información de módulos operativos; parámetros gobiernan estados, tarifas, mensajes, contacto y temporada.

## 4. Flujos críticos

### Registro de guía por cliente

1. **Entrada**: `/mis-guias`, DTO `MiGuiaCreateRequest`.
2. **Validación**: Bean Validation, pertenencia/visibilidad del consignatario y unicidad del tracking.
3. **Persistencia**: `guia_master` inicia en `PENDIENTE_VERIFICACION`; se registra historial.
4. **Salida**: DTO de guía del cliente y actualización de consultas frontend.
5. **Permiso**: `MIS_GUIAS_CREATE`.
6. **Errores**: 400 por validación/regla, 403 por permiso, 409 por tracking duplicado.

### Aprobación y avance de guía master

1. Operario/admin aprueba una guía pendiente mediante `/api/guias-master/{id}/aprobar`.
2. `GuiaMasterService` recalcula estado desde sus piezas.
3. Asignación a consolidado, recepción y despacho actualizan estados parciales/completos.
4. Estados congelados o terminales no son sobrescritos por recálculo.
5. Cada cambio relevante se audita en `guia_master_estado_historial`.
   - **Vista en `GuiasMasterPage`**: pestaña «Operativas» (excluye `PENDIENTE_VERIFICACION`, listado por defecto) vs «Pendientes de aprobación» (solo `PENDIENTE_VERIFICACION`). El filtrado por pestaña envía listas explícitas de estados al filtro `estado` existente del backend; no hay endpoint nuevo. La pestaña de pendientes marca como inconsistencia administrativa las guías con `piezasRegistradas > 0` (no se corrigen automáticamente).
   - **Bloqueo de operaciones nuevas**: `EstadoGuiaMaster.bloqueaOperacionesNuevas()` (`PENDIENTE_VERIFICACION`, `EN_REVISION`) se aplica en `GuiaMasterService.validarYAsignarPieza`, regla central por la que pasan todas las rutas de alta de pieza (`PaqueteService.create` y reasignación). El frontend además excluye esas guías del selector de `PaqueteBulkCreateForm` (`guiaAdmiteRegistroDePiezas`) y bloquea agregar piezas en edición; la seguridad real es de backend.
6. Las acciones `APROBAR`, `RECALCULAR`, `MARCAR_REVISION`, `SALIR_REVISION`, `CANCELAR` y `REABRIR` también pueden enviarse en lote a `POST /api/guias-master/aplicar-accion`.
7. El bulk reutiliza las reglas individuales y devuelve conteo de procesadas y rechazos por guía con motivo, sin introducir permisos nuevos.

### Consolidación y recepción

1. Se crea un envío consolidado y se asocian paquetes elegibles. **Admisión por estado anterior**: al agregar paquetes (`EnvioConsolidadoService.agregarPaquetes`, también vía `crearConGuias`), cada paquete recién asociado debe estar EXACTAMENTE en el estado de rastreo inmediatamente anterior a `estadoRastreoAsociarEnvioConsolidadoId` (resuelto con `EstadoRastreoService.resolverTransicionInmediata`, configurado en /parametros-sistema/por-punto). No se hardcodean estados.
2. `GET /api/envios-consolidados/transiciones-operativas` compone y ordena la ruta desde los estados operativos; cada transición conserva el estado de paquete configurado únicamente como efecto de rastreo.
3. La transición individual usa el mismo preview que el avance automático. El avance selecciona `Hasta`; el backend deriva la transición inicial desde el estado operativo común de los consolidados y aplica todas las transiciones configuradas del rango.
4. El listado incluye únicamente consolidados en `En preparación`, `Cerrado` o `Enviado desde USA`. La primera selección fija el estado inicial del grupo; `Arribado a Ecuador` es el límite final y `Recibido en bodega` pertenece al lote de recepción.
5. `POST /api/envios-consolidados/preview-secuencia-estados` vuelve a cargar únicamente los paquetes actualmente vinculados a los consolidados elegidos, valida el estado operativo común y devuelve pasos, totales, detalle y `previewToken`; los estados actuales de los paquetes no deciden el inicio ni el destino.
6. El token incluye versiones, estado y pertenencia `paquete -> consolidado`; mover un paquete después del preview invalida la aplicación.
7. `POST /api/envios-consolidados/aplicar-secuencia-estados` revalida con locks pesimistas y aplica toda la selección en una transacción: estado operativo, estado de paquetes y eventos por transición.
8. Un token obsoleto produce 409 y obliga a regenerar la vista previa; cualquier fallo revierte la secuencia completa.
9. Los contratos anteriores de avance operativo se conservan por compatibilidad, pero la UI canónica usa el catálogo y la secuencia unificada.
10. Un lote de recepción registra guías/paquetes que llegan a bodega. **Admisión por estado anterior**: solo se pueden recibir consolidados en `ARRIBADO_ECUADOR`. `findDisponiblesParaRecepcion` lista únicamente consolidados en ese estado, con paquetes y no recibidos antes; `LoteRecepcionService.create`/`agregarGuias` revalidan transaccionalmente. Al admitir uno válido, pasa a `RECIBIDO_EN_BODEGA`.
11. **Despacho** mantiene la regla de estado anterior inmediato: las sacas solo ingresan si todos sus paquetes están exactamente en el estado anterior a `estadoRastreoEnDespachoId`.
12. Errores relevantes: estados operativos iniciales mixtos, destino incompatible, cronología inválida, configuración incompleta, duplicado en lote y concurrencia.

### Despacho y confirmación de entrega

1. Operario crea despacho y selecciona tipo `DOMICILIO`, `AGENCIA` o `AGENCIA_COURIER_ENTREGA`; el despacho puede guardarse sin sacas.
2. Para incorporar una saca nueva, el backend resuelve el estado de entrada desde parámetros y exige que todos sus paquetes estén exactamente en el estado activo inmediatamente anterior del mismo flujo por orden efectivo.
3. `/api/operario/despachos/sacas-elegibles` filtra candidatas y devuelve el nombre configurado del estado requerido; `create` y `update` revalidan bajo transacción antes de asociar y aplicar el estado destino.
4. En edición solo se valida esta regla para sacas nuevas; las ya asociadas no se rechazan si sus paquetes avanzaron.
5. El cliente o una sesión por enlace consulta `/mis-entregas`.
6. La entrega se confirma con `MIS_ENTREGAS_CONFIRM` y genera cambios de estado/eventos/notificaciones según el servicio.

### Revisión administrativa de paquetes

1. `POST /api/mis-paquetes/{id}/revisiones` inicia una revisión con motivo estructurado; `OTRO` exige observación.
2. `POST /api/mis-paquetes/{id}/revisiones/activa/resolver` registra usuario, fecha y observación. Ninguna operación altera `Paquete.estadoRastreo`.
3. `GET /api/mis-paquetes/{id}/revisiones` consulta el historial y `/activa` consulta la revisión vigente.
4. `/page` y `/resumen` aceptan `bandeja=todos|operativos|en_revision`; el filtro se aplica en SQL antes de paginar y contar.
5. `PaqueteOperacionValidator` bloquea asignación a saca/guía, consolidación, despacho, lote y cambios de estado manuales, automáticos o masivos. Las correcciones permanecen disponibles.
6. Selectores de operario, paquetes sin saca, búsqueda por guías, destinos de estado y sacas elegibles excluyen revisiones activas desde backend.
7. La concurrencia se protege con lock de paquete, `@Version` e índice único parcial `uq_revision_paquete_activa`.

### Inventario de bandejas candidatas

| Módulo | Condición canónica | Tarea especializada | Beneficio | Recomendación |
|---|---|---|---|---|
| Guías master | `PENDIENTE_VERIFICACION`, `EN_REVISION` | Aprobar, corregir o salir de revisión | Separa operación normal de control administrativo | Mantener el patrón actual; no ampliarlo aquí porque ya tiene pestañas y reglas propias |
| Envíos consolidados | `CERRADO`, `ENVIADO_DESDE_USA`, `ARRIBADO_ECUADOR` y previews obsoletos | Avance operativo y resolución de conflictos | Reduce mezcla entre preparación y tránsito | Diseñar con métricas reales; sus estados forman una secuencia, no una revisión |
| Lotes de recepción | Consolidado `ARRIBADO_ECUADOR` aún no recibido | Recepción física | Prioriza trabajo pendiente de ingreso | Candidato fuerte, pero faltan SLA, asignación y reglas de recepción parcial |
| Despachos | Preparación, salida y entrega pendiente | Armado, despacho y seguimiento | Clarifica colas por hito | Esperar estados canónicos propios; hoy varias condiciones se derivan de paquetes |
| Liquidaciones | No pagada, pagada o con referencias bloqueadas | Revisión financiera y cobro | Separa cuentas accionables del histórico | Requiere catálogo financiero y responsables confirmados |
| Manifiestos | Borrador/incompleto/listo, si se confirma | Completar y cerrar | Hace visible trabajo incompleto | Auditar primero el modelo; no crear estados por inferencia |

### Rastreo público

1. **Entrada**: código de pieza o tracking base de guía master.
2. **Protección**: rate limit por IP/configuración y validación del código.
3. **Resolución**: `TrackingResolverService` distingue `PIEZA` o `GUIA_MASTER`.
4. **Catálogo**: estados activos y públicos; bases por `ordenTracking`; alternos insertados por `afterEstado` y visibles solo si ocurrieron o son el actual.
5. **Ejemplos**: `TrackingExampleService` genera escenarios sintéticos sin consultar registros de negocio y reutiliza `TrackingResolveResponse`.
6. **Entrega**: `AGENCIA` + agencia representa **Retiro en oficina**; `AGENCIA_COURIER_ENTREGA` representa **Punto de retiro del courier**; el plazo usa la configuración vigente y expone fecha límite.
7. **Salida**: pantalla, PDF e imagen consumen el mismo DTO. El progreso cuenta solo estados base y queda indeterminado si no puede ubicarse el paso.
8. **Caché**: el ETag deriva del payload público completo, por lo que catálogo, leyendas, orden, alternos, plazo y entrega invalidan 304.
9. **Errores**: 404 no encontrado, 429 por rate limit, respuesta neutral ante fallos internos.

### Liquidación

1. Se crea cabecera de liquidación.
2. Se agregan líneas de envíos consolidados y/o despachos disponibles.
3. Se calculan/importan importes del contrato de cada línea.
4. Puede marcarse pagada/no pagada y exportarse PDF/XLSX.
5. Permisos separados de lectura y escritura; conflictos si una referencia ya fue liquidada.

### Estadísticas (periodos, granularidad y comparación)

1. **Contrato API** `GET /api/estadisticas` (zona `America/Guayaquil`). Prioridad de parámetros: `desde`+`hasta` (rango explícito, `hasta` **exclusivo**) > `preset` (+`anio`/`mes` para `MES_ESPECIFICO`) > `meses` (legado, conservado temporalmente) > preset por defecto `ULTIMOS_12_MESES`. `granularidad` es un override opcional (`DIARIA`/`SEMANAL`/`MENSUAL`/`TRIMESTRAL`).
2. **`PeriodoEstadisticasResolver`** (lógica de calendario pura, sin acceso a datos) normaliza a `[desde, hastaExclusivo)`, calcula el **periodo anterior equivalente**, marca `periodoParcial` y resuelve la granularidad automática (≤31 días diaria; 32–120 semanal; ≤24 meses mensual; resto trimestral). «Este mes»/«este año» comparan hasta hoy contra el mismo tramo del periodo anterior; los presets calendario completos comparan contra el periodo previo completo; rango personalizado contra el rango inmediatamente anterior de igual duración. Valida `desde<hasta`, no futuro y máximo (`MAX_DIAS=800`); los errores usan `BadRequestException` (400).
3. **`EstadisticasService`** separa la respuesta en `resultados` (métricas históricas con `MetricaComparable` —actual, anterior, diferencia, variación % y `comparacionDisponible`— más series por granularidad inicializadas en cero) y `estadoActual` (fotografía operativa: pendientes, demorados, entregados sin despacho, excepciones, distribución y tablas; con `generadoEn`). Las series se agregan en base de datos con `date_trunc(:trunc, …)` (`DespachoRepository.aggregateByPeriodo`/`aggregateResumen`, `PaqueteRepository.aggregateRegistradosByPeriodo`); no se agrupa localmente.
4. **Frontend**: la selección vive en la URL (`preset`/`anio`/`mes`/`desde`/`hasta`/`gran`), normalizada por `normalizeSearch`; parámetros inválidos vuelven al preset seguro. La `queryKey` incluye los parámetros resueltos. El PDF refleja periodo, periodo anterior, variaciones, granularidad, indicador de periodo en curso y la separación con la fotografía actual; el nombre de archivo es descriptivo por fechas.

## 5. Zonas de búsqueda

- Frontend: `ecubox-frontend/src/pages`, `components`, `hooks`, `lib/api`, `types`, `lib/schemas`, `routes/router.tsx`.
- Backend: `ecubox-backend/src/main/java/com/ecubox/ecubox_backend/{controller,service,repository,dto,entity,enums,mapper}`.
- Base de datos: `ecubox-backend/src/main/resources/db/migration`.
- Tests: `ecubox-backend/src/test/java`, `ecubox-frontend/src/**/*.test.{ts,tsx}`.
- Configuración: `application*.properties`, `pom.xml`, `package.json`, `vite.config.ts`, `docker-compose.yml`, Dockerfiles, `.github/workflows`.
- Documentación: `docs/nomenclatura.md`, `docs/desarrollo`, `docs/usuario`, `docs/despliegue`.

## 6. Pendientes de confirmar

- No se encontraron pruebas E2E ni contratos OpenAPI versionados en `docs/openapi/`; `docs/openapi/README.md` describe exportación, no una especificación comprometida.
- No todos los módulos tienen tests directos; la tabla distingue cobertura indirecta de prueba dedicada.
- El endpoint canónico documental de consignatarios está desalineado: el código separa vistas de cliente y operario.
- La rama de producción y el mecanismo automático de despliegue no están declarados en configuración versionada.
- `docs/desarrollo/API_REFERENCE.md` debe cotejarse endpoint por endpoint antes de considerarse contrato ejecutable.
