# Mapa canónico de módulos ECUBOX

> Fuente funcional: rama `dev`, merge `05a5cf73f770f8e230e0cdba34f7c77afdfb8cf7`.
> Salvo indicación contraria, las rutas y clases de este documento están **verificadas en Git**.

## 1. Inventario funcional

| Módulo | Frontend | API/controladores | Backend y persistencia | Permisos principales | Tests directos |
|---|---|---|---|---|---|
| Sitio público y legal | `/`, `/terminos`, `/privacidad`, `/enlaces` en `src/pages/home`, `legal`, `enlaces` | Configuración pública en `ConfigPublicController` | `ParametroSistemaService/Repository`, `parametro_sistema` | Público según `SecurityConfig` | `seasons.test.ts`, pruebas PWA/tema |
| Autenticación, perfil y registro | `/login`, `/registro`, `/perfil`; `authStore`, `auth.service.ts` | `/api/auth`; `AuthController` | `UsuarioService`, `JwtService`, `UsuarioRepository`; `usuario`, `rol`, `permiso` | `PERFIL_READ`, `PERFIL_UPDATE`; login/registro simple públicos | `LoginRequestValidationTest`, `JwtServiceTest` |
| Usuarios, roles y permisos | `/usuarios`, `/roles`, `/permisos` | `UsuarioController`, `RolController`, `PermisoController` | Services/repositories homónimos; `usuario`, `rol`, `permiso`, uniones de seguridad | `USUARIOS_*`, `ROLES_*`, `PERMISOS_READ` | Sin test directo localizado |
| Enlaces de acceso | `/enlaces-acceso`, `/acceso`; `useAccesoEnlaces` | `/api/acceso-enlaces`, `/api/auth/acceso-enlace`; `AccesoEnlaceController`, `AuthController` | `AccesoEnlaceService/Repository`, `AccesoSessionResolver`; `acceso_enlace`, relación con consignatarios | `ACCESO_ENLACES_MANAGE` y permisos `ACCESO_ENLACE_*` | Sin test directo localizado |
| Consignatarios/destinatarios | `/consignatarios`; `useConsignatarios` | `/api/mis-consignatarios`, `/api/operario/consignatarios` | `ConsignatarioService`, versionado SCD2 y repositorios; `consignatario`, `consignatario_version` | `CONSIGNATARIOS_*`, `CONSIGNATARIOS_OPERARIO`, acceso por enlace | Cubierto indirectamente en servicios de guías/paquetes |
| Guías master y Mis guías | `/guias-master`, `/guias-master/$id`, `/mis-guias`, `/mis-guias/$id`; hooks `useGuiasMaster`, `useMisGuias`; diálogos masivos de selección, motivo y resultado | `/api/guias-master`, `POST /api/guias-master/aplicar-accion`, `/api/mis-guias`; `GuiaMasterController`, `MisGuiasController` | `GuiaMasterService`, DTOs `AplicarAccionGuiasMaster*`, historial/repositories; `guia_master`, `guia_master_estado_historial` | `GUIAS_MASTER_*`, `MIS_GUIAS_*`, `ACCESO_ENLACE_GUIAS_READ`; el bulk usa `GUIAS_MASTER_UPDATE` | `GuiaMasterServiceTest`, `AplicarEstadoMasivoDialog.test.tsx`, `ResultadoBulkDialog.test.tsx` |
| Paquetes, piezas, pesaje y vencidos | `/paquetes`, `/pesaje`, `/paquetes-vencidos`; hooks `usePaquetes`, `usePaquetesOperario` | `/api/paquetes`, `/api/operario/paquetes`; `PaqueteController`, `OperarioPaqueteController` | `PaqueteService`, repositories/eventos; `paquete`, `paquete_estado_evento`, vista de rastreo | `PAQUETES_*`, `PAQUETES_OPERARIO`, `PAQUETES_PESO_WRITE` | `PaqueteTest`, suites `PaqueteService*`, `paquetes.service.test.ts`, utilidades de peso |
| Estados de rastreo | sección `/parametros-sistema/estados` y `/por-punto`; `useEstadosRastreo` | `/api/operario/estados-rastreo`, `/api/operario/config/estados-rastreo-por-punto` | `EstadoRastreoService`, resolver y repository; `estado_rastreo`, `estado_rastreo_transicion`, parámetros | `ESTADOS_RASTREO_*` | `EstadoRastreoServiceTest`, `ParametroSistemaServiceEstadosManualesTest`, diálogo de leyenda |
| Envíos consolidados | `/envios-consolidados`, detalle; `useEnviosConsolidados` | `/api/envios-consolidados`; `EnvioConsolidadoController` | `EnvioConsolidadoService`, resolver operativo, manifiesto de consolidado; `envio_consolidado` y relación con paquetes | `ENVIOS_CONSOLIDADOS_*` | `EnvioConsolidadoServiceTest`, `EstadoConsolidadoOperativoResolverTest` |
| Lotes de recepción | `/lotes-recepcion`, nuevo y detalle; `useLotesRecepcion` | `/api/operario/lotes-recepcion`; `OperarioLoteRecepcionController` | `LoteRecepcionService`; `lote_recepcion`, `lote_recepcion_guia` | `LOTES_RECEPCION_READ/CREATE/DELETE` | `LoteRecepcionServiceTest` |
| Despachos, sacas y Mis entregas | `/despachos`, alta/detalle/edición; `/mis-entregas`; hooks operario/cliente | `/api/operario/despachos`, `/api/operario/sacas`, `/api/mis-despachos` | `DespachoService`, `SacaService`, `MisDespachosService`; `despacho`, `saca` | `DESPACHOS_WRITE`, `MIS_ENTREGAS_*`, acceso por enlace | `DespachoServiceTest`, distribución de sacas frontend |
| Manifiestos | `/manifiestos`, detalle; `useManifiestos` | `/api/manifiestos`; `ManifiestoController` | `ManifiestoService/Repository`; `manifiesto`; asigna despachos | `MANIFIESTOS_READ/WRITE` | Sin test directo localizado |
| Liquidaciones | `/liquidaciones`, detalle; `useLiquidacion` | `/api/liquidaciones`; `LiquidacionController` | `LiquidacionService`, `LiquidacionExportService`; `liquidacion` y líneas de consolidado/despacho | `LIQUIDACION_CONSOLIDADO_READ/WRITE` | Sin test directo localizado |
| Red de entrega | `/couriers-entrega`, `/agencias`, `/puntos-entrega`; hooks admin | Controllers de courier, agencia y puntos; variantes `/api/operario/*` | Services/repositories + versiones SCD2; `courier_entrega`, `agencia`, `agencia_courier_entrega` y tablas versionadas | `COURIERS_ENTREGA_*`, `AGENCIAS_*`, `PUNTOS_ENTREGA_*`; operario usa `DESPACHOS_WRITE` en consultas seleccionadas | Sin test directo localizado |
| Rastreo público | `/tracking`, `/tracking/ejemplo`; `tracking.service.ts`, componentes de resultados/exportación | `/api/tracking`; `TrackingController`, health de proyector | `TrackingResolverService`, eventos/outbox/proyector; `paquete_estado_evento`, `outbox_event`, `tracking_view_paquete`, `tracking_projector_state` | Público con rate limit; health interno con `TRACKING_PROJECTOR_HEALTH_READ` | Resolver, eventos, proyector, ETag, cache y rate limit |
| Notificaciones y Web Push | `NotificationBell`, `useNotificaciones`, `useWebPush`, service worker | `/api/notificaciones`, `/api/push`; controllers homónimos | `NotificacionService`, `WebPushService`; `notificacion_usuario`, `web_push_subscription` | Usuario autenticado; exposición puntual de clave pública | Pruebas PWA; sin test backend directo localizado |
| Estadísticas | `/estadisticas`; `useEstadisticas`, charts | `/api/estadisticas`; `EstadisticasController` | `EstadisticasService`, `EstadisticasExcepcionRepository` y consultas agregadas | `ESTADISTICAS_READ` | `EstadisticasServiceTest`, `EstadisticasCharts.test.tsx` |
| Parámetros y calculadoras | `/calculadora`, `/tarifa-calculadora`, `/parametros-sistema/$seccion` | `/api/config/*`, `/api/operario/config/*`, tarifa de distribución | `ParametroSistemaService`, `ConfigCalculadoraService`, `ConfigTarifaDistribucionService`; tablas de configuración | `PARAMETROS_SISTEMA_READ`, permisos por sección | Pruebas de parámetros/estados y esquemas frontend |
| Casillero | `/casillero`; sección de parámetros de casillero | Config pública `mensaje-agencia-eeuu`; no hay `CasilleroController` | Datos presentados desde parámetros y perfil; no existe entidad `Casillero` | `CASILLERO_READ`, `MENSAJE_AGENCIA_EEUU_*` | Sin test directo localizado |

## 2. Capas técnicas compartidas

| Área | Rutas |
|---|---|
| Seguridad | Backend `config/SecurityConfig.java`, filtros JWT/rate limit, `security/`; frontend `authStore.ts`, guards del router |
| Errores | Backend `exception/`; frontend `lib/api/error-message.ts`, interceptor Axios, estados de error de página |
| Paginación/búsqueda | `PageResponse`, `Pageables`, `SearchSpecifications`, `useSearchPagination`, `createCrudQueryHooks` |
| Exportación | Frontend `lib/pdf`, `lib/xlsx`, `lib/exporters`; backend exportadores de consolidado/liquidación |
| Observabilidad | Health, Micrometer, logs, health del proyector, ETag |
| PWA | `vite.config.ts`, `src/sw.ts`, hooks PWA/Web Push, manifest e iconos |
| Configuración | `application*.properties`, `.env.example`, Vite, Caddy, Docker, Railway |

## 3. Dependencias entre módulos

- Usuario/roles/permisos habilitan todos los módulos privados.
- Enlaces de acceso crean sesiones limitadas para Mis guías, Mis entregas, consignatarios y casillero.
- Una guía master agrupa piezas persistidas como `Paquete` y se vincula a un consignatario.
- Paquetes y guías master alimentan envíos consolidados.
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
6. Las acciones `APROBAR`, `RECALCULAR`, `MARCAR_REVISION`, `SALIR_REVISION`, `CANCELAR` y `REABRIR` también pueden enviarse en lote a `POST /api/guias-master/aplicar-accion`.
7. El bulk reutiliza las reglas individuales y devuelve conteo de procesadas y rechazos por guía con motivo, sin introducir permisos nuevos.

### Consolidación y recepción

1. Se crea un envío consolidado y se asocian paquetes elegibles.
2. Se cierra, marca enviado desde USA y arribado a Ecuador mediante transiciones explícitas.
3. Un lote de recepción registra guías/paquetes que llegan a bodega.
4. Se persisten estados operativos, eventos y vistas derivadas.
5. Errores relevantes: transición inválida, paquete no elegible, duplicado en lote y locking optimista.

### Despacho y confirmación de entrega

1. Operario crea despacho y selecciona tipo `DOMICILIO`, `AGENCIA` o `AGENCIA_COURIER_ENTREGA`.
2. Puede organizar paquetes en sacas y aplicar estado de rastreo.
3. El cliente o una sesión por enlace consulta `/mis-entregas`.
4. La entrega se confirma con `MIS_ENTREGAS_CONFIRM`.
5. La confirmación genera cambios de estado/eventos/notificaciones según el servicio.

### Rastreo público

1. **Entrada**: código de pieza o tracking base de guía master.
2. **Protección**: rate limit por IP/configuración y validación del código.
3. **Resolución**: `TrackingResolverService` distingue `PIEZA` o `GUIA_MASTER`.
4. **Lectura**: vista proyectada y/o eventos según configuración.
5. **Salida**: DTO de rastreo con ETag/cache HTTP cuando aplica.
6. **Errores**: 404 no encontrado, 429 por rate limit, respuesta neutral ante fallos internos.

### Liquidación

1. Se crea cabecera de liquidación.
2. Se agregan líneas de envíos consolidados y/o despachos disponibles.
3. Se calculan/importan importes del contrato de cada línea.
4. Puede marcarse pagada/no pagada y exportarse PDF/XLSX.
5. Permisos separados de lectura y escritura; conflictos si una referencia ya fue liquidada.

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
