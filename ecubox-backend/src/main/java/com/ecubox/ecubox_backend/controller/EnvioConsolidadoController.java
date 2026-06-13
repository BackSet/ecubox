package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateRequest;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateResponse;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoDTO;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoPaquetesRequest;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoResumenDTO;
import com.ecubox.ecubox_backend.dto.AplicarEstadoEnConsolidadosRequest;
import com.ecubox.ecubox_backend.dto.AplicarEstadoEnConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosPreviewDTO;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosRequest;
import com.ecubox.ecubox_backend.dto.AvanceEstadosConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.AplicarTransicionConsolidadosRequest;
import com.ecubox.ecubox_backend.dto.AplicarTransicionConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.AvanceOperativoConsolidadosPreviewDTO;
import com.ecubox.ecubox_backend.dto.AvanceOperativoConsolidadosRequest;
import com.ecubox.ecubox_backend.dto.AvanceOperativoConsolidadosResponse;
import com.ecubox.ecubox_backend.dto.DestinoAvanceOperativoDTO;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.EnvioConsolidadoService;
import com.ecubox.ecubox_backend.service.ManifiestoEnvioConsolidadoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Administración", description = "Gestión de envíos consolidados")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/envios-consolidados")
public class EnvioConsolidadoController {

    private final EnvioConsolidadoService envioConsolidadoService;
    private final ManifiestoEnvioConsolidadoService manifiestoService;
    private final CurrentUserService currentUserService;

    public EnvioConsolidadoController(EnvioConsolidadoService envioConsolidadoService,
                                      ManifiestoEnvioConsolidadoService manifiestoService,
                                      CurrentUserService currentUserService) {
        this.envioConsolidadoService = envioConsolidadoService;
        this.manifiestoService = manifiestoService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_READ')")
    @Operation(summary = "Listar envíos consolidados", description = "Consulta envíos consolidados con filtros de estado, pago, búsqueda y paginación")
    @ApiResponse(responseCode = "200", description = "Página de envíos consolidados")
    public ResponseEntity<PageResponse<EnvioConsolidadoDTO>> findAll(
            @Parameter(description = "Filtro operativo: TODOS, VACIO, EN_PREPARACION, CERRADO, ENVIADO_DESDE_USA, ARRIBADO_ECUADOR, RECIBIDO_EN_BODEGA, LIQUIDADO o CANCELADO") @RequestParam(required = false) String estado,
            @Parameter(description = "Filtro de pago: TODOS, PAGADO o NO_PAGADO") @RequestParam(required = false) String estadoPago,
            @Parameter(description = "Texto de búsqueda") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "20") int size) {
        EstadoEnvioConsolidadoOperativo estadoOperativoFilter = parseEstadoOperativoFilter(estado);
        com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado pagoFilter = parseEstadoPagoFilter(estadoPago);
        Page<EnvioConsolidado> resultado = envioConsolidadoService.findAll(estadoOperativoFilter, pagoFilter, q, page, size);
        return ResponseEntity.ok(PageResponse.of(resultado, e -> envioConsolidadoService.toDTO(e, false)));
    }

    @GetMapping("/resumen")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_READ')")
    @Operation(summary = "Resumen del listado de envíos consolidados", description = "Conteo por estado operativo y por estado de pago para KPIs y chips")
    @ApiResponse(responseCode = "200", description = "Resumen de envíos consolidados")
    public ResponseEntity<EnvioConsolidadoResumenDTO> resumen() {
        return ResponseEntity.ok(envioConsolidadoService.resumen());
    }

    /**
     * Lista los envios consolidados que pueden incluirse en un nuevo lote de
     * recepcion. A diferencia del listado general, no filtra por salida USA
     * ni por estado de pago: un consolidado ya liquidado (PAGADO + ENVIADO_DESDE_USA)
     * sigue siendo recepcionable mientras no haya llegado fisicamente. Los
     * envios sin paquetes y los que ya estan en algun lote de recepcion se
     * excluyen del resultado.
     */
    @GetMapping("/disponibles-recepcion")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Listar consolidados disponibles para recepción", description = "Obtiene envíos consolidados elegibles para incluir en un lote de recepción")
    @ApiResponse(responseCode = "200", description = "Página de consolidados disponibles")
    public ResponseEntity<PageResponse<EnvioConsolidadoDTO>> findDisponiblesParaRecepcion(
            @Parameter(description = "Texto de búsqueda") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "50") int size) {
        Page<EnvioConsolidado> resultado = envioConsolidadoService.findDisponiblesParaRecepcion(q, page, size);
        return ResponseEntity.ok(PageResponse.of(resultado, e -> envioConsolidadoService.toDTO(e, false)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_READ')")
    @Operation(summary = "Obtener envío consolidado por ID", description = "Devuelve el detalle de un envío consolidado")
    @ApiResponse(responseCode = "200", description = "Envío consolidado encontrado")
    public ResponseEntity<EnvioConsolidadoDTO> findById(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.findById(id);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, true));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_CREATE')")
    @Operation(summary = "Crear envío consolidado", description = "Crea un envío consolidado a partir de una lista de guías")
    @ApiResponse(responseCode = "201", description = "Envío consolidado creado")
    public ResponseEntity<EnvioConsolidadoCreateResponse> crear(@Valid @RequestBody EnvioConsolidadoCreateRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        EnvioConsolidadoCreateResponse response = envioConsolidadoService.crearConGuias(
                request.getCodigo(),
                request.getNumerosGuia(),
                usuarioId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/cerrar-consolidado")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Cerrar consolidado para registro", description = "Cierra el consolidado (EN_PREPARACION → CERRADO) y aplica el estado 'Manifestado' a sus piezas")
    @ApiResponse(responseCode = "200", description = "Envío consolidado cerrado")
    public ResponseEntity<EnvioConsolidadoDTO> cerrarConsolidado(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.cerrarConsolidado(id);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, false));
    }

    @PostMapping("/{id}/enviar-usa")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Enviar consolidado desde USA", description = "Marca el consolidado como enviado desde USA (CERRADO → ENVIADO_DESDE_USA) y aplica el estado de salida a sus piezas")
    @ApiResponse(responseCode = "200", description = "Envío consolidado enviado desde USA")
    public ResponseEntity<EnvioConsolidadoDTO> enviarDesdeUsa(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.enviarDesdeUsa(id, null);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, false));
    }

    @PostMapping("/{id}/arribar-ecuador")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Registrar arribo a Ecuador", description = "Registra el arribo a Ecuador (ENVIADO_DESDE_USA → ARRIBADO_ECUADOR) y aplica el estado 'Llega a aduana destino' a sus piezas")
    @ApiResponse(responseCode = "200", description = "Arribo a Ecuador registrado")
    public ResponseEntity<EnvioConsolidadoDTO> arribarEcuador(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.marcarArribadoEcuador(id, null);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, false));
    }

    @PostMapping("/{id}/cancelar")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Cancelar consolidado", description = "Cancela el consolidado desde cualquier estado, salvo LIQUIDADO o CANCELADO")
    @ApiResponse(responseCode = "200", description = "Envío consolidado cancelado")
    public ResponseEntity<EnvioConsolidadoDTO> cancelar(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.cancelarConsolidado(id);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, false));
    }

    /** @deprecated Compatibilidad con clientes antiguos. Usar /cerrar-consolidado seguido de /enviar-usa. */
    @Deprecated
    @PostMapping("/{id}/cerrar")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Cerrar consolidado (heredado)", description = "Alias heredado: cierra el consolidado para registro")
    @ApiResponse(responseCode = "200", description = "Envío consolidado cerrado")
    public ResponseEntity<EnvioConsolidadoDTO> cerrar(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.cerrarConsolidado(id);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, false));
    }

    @PostMapping("/{id}/reabrir")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Reabrir consolidado", description = "Devuelve el consolidado a EN_PREPARACION desde CERRADO o ENVIADO_DESDE_USA")
    @ApiResponse(responseCode = "200", description = "Envío consolidado devuelto a preparación")
    public ResponseEntity<EnvioConsolidadoDTO> reabrir(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.reabrir(id);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, false));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_DELETE')")
    @Operation(summary = "Eliminar envío consolidado", description = "Elimina un envío consolidado, opcionalmente eliminando sus paquetes")
    @ApiResponse(responseCode = "204", description = "Envío consolidado eliminado")
    public ResponseEntity<Void> eliminar(@PathVariable Long id,
                                         @Parameter(description = "Eliminar también los paquetes asociados") @RequestParam(name = "eliminarPaquetes",
                                                       defaultValue = "false") boolean eliminarPaquetes) {
        envioConsolidadoService.eliminar(id, eliminarPaquetes);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/paquetes")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Agregar paquetes al consolidado", description = "Asocia paquetes existentes a un envío consolidado")
    @ApiResponse(responseCode = "200", description = "Envío consolidado actualizado")
    public ResponseEntity<EnvioConsolidadoDTO> agregarPaquetes(@PathVariable Long id,
                                                               @Valid @RequestBody EnvioConsolidadoPaquetesRequest request) {
        EnvioConsolidado envio = envioConsolidadoService.agregarPaquetes(id, request.getPaqueteIds());
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, true));
    }

    @DeleteMapping("/{id}/paquetes")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Remover paquetes del consolidado", description = "Desasocia paquetes de un envío consolidado")
    @ApiResponse(responseCode = "200", description = "Envío consolidado actualizado")
    public ResponseEntity<EnvioConsolidadoDTO> removerPaquetes(@PathVariable Long id,
                                                               @Valid @RequestBody EnvioConsolidadoPaquetesRequest request) {
        EnvioConsolidado envio = envioConsolidadoService.removerPaquetes(id, request.getPaqueteIds());
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, true));
    }

    @GetMapping("/estados-aplicables")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Listar estados aplicables", description = "Obtiene estados posteriores al punto de asociación a consolidado")
    public ResponseEntity<List<EstadoRastreoDTO>> estadosAplicables() {
        return ResponseEntity.ok(envioConsolidadoService.listarEstadosAplicables());
    }

    @GetMapping("/estados-destino-secuencia")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Listar destinos del avance automático",
            description = "Obtiene estados activos compatibles con el flujo de consolidados")
    public ResponseEntity<List<EstadoRastreoDTO>> estadosDestinoSecuencia() {
        return ResponseEntity.ok(envioConsolidadoService.listarDestinosAvanceEstados());
    }

    @GetMapping("/candidatos-avance-estados")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Listar candidatos del avance automático",
            description = "Excluye consolidados vacíos, sin estado operativo o fuera del flujo iniciado en preparación")
    public ResponseEntity<List<EnvioConsolidadoDTO>> candidatosAvanceEstados() {
        return ResponseEntity.ok(envioConsolidadoService.listarCandidatosAvanceEstados().stream()
                .map(envio -> envioConsolidadoService.toDTO(envio, false))
                .toList());
    }

    @GetMapping("/elegibles-para-estado-rastreo")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Listar consolidados elegibles para un estado de rastreo",
            description = "Ids de consolidados con paquetes en el estado de rastreo inmediatamente "
                    + "anterior al indicado (regla de 'ir de 1 en 1')")
    public ResponseEntity<List<Long>> elegiblesParaEstadoRastreo(@RequestParam Long estadoRastreoId) {
        return ResponseEntity.ok(envioConsolidadoService.listarElegiblesParaEstadoRastreo(estadoRastreoId));
    }

    @PostMapping("/aplicar-estado")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Aplicar estado a consolidados", description = "Aplica un estado de rastreo a todas las piezas de los consolidados seleccionados")
    public ResponseEntity<AplicarEstadoEnConsolidadosResponse> aplicarEstado(
            @Valid @RequestBody AplicarEstadoEnConsolidadosRequest request) {
        return ResponseEntity.ok(envioConsolidadoService.aplicarEstadoRastreo(
                request.getConsolidadoIds(),
                request.getEstadoRastreoId()));
    }

    @PostMapping("/preview-secuencia-estados")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Previsualizar avance automático de estados",
            description = "Valida la selección y calcula todos los pasos intermedios sin modificar datos")
    public ResponseEntity<AvanceEstadosConsolidadosPreviewDTO> previewSecuenciaEstados(
            @Valid @RequestBody AvanceEstadosConsolidadosRequest request) {
        return ResponseEntity.ok(envioConsolidadoService.previewAvanceEstados(request));
    }

    @PostMapping("/aplicar-secuencia-estados")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Aplicar avance automático de estados",
            description = "Aplica atómicamente todos los estados intermedios a los consolidados seleccionados")
    public ResponseEntity<AvanceEstadosConsolidadosResponse> aplicarSecuenciaEstados(
            @Valid @RequestBody AvanceEstadosConsolidadosRequest request) {
        return ResponseEntity.ok(envioConsolidadoService.aplicarAvanceEstados(request));
    }

    @PostMapping("/aplicar-transicion-operativa")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Aplicar transición operativa a consolidados",
            description = "Aplica un estado operativo (Enviado desde USA / En preparación) por selección o por periodo")
    public ResponseEntity<AplicarTransicionConsolidadosResponse> aplicarTransicionOperativa(
            @Valid @RequestBody AplicarTransicionConsolidadosRequest request) {
        return ResponseEntity.ok(envioConsolidadoService.aplicarTransicionOperativa(
                request.getEstadoOperativoDestino(),
                request.getConsolidadoIds(),
                request.getFechaInicio(),
                request.getFechaFin()));
    }

    @GetMapping("/destinos-avance-operativo")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Listar destinos del avance operativo",
            description = "Estados operativos destino del avance automático: CERRADO, ENVIADO_DESDE_USA y ARRIBADO_ECUADOR")
    public ResponseEntity<List<DestinoAvanceOperativoDTO>> destinosAvanceOperativo() {
        return ResponseEntity.ok(envioConsolidadoService.listarDestinosAvanceOperativo());
    }

    @GetMapping("/candidatos-avance-operativo")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Listar candidatos del avance operativo",
            description = "Consolidados con paquetes en un estado operativo origen válido (EN_PREPARACION, CERRADO o ENVIADO_DESDE_USA)")
    public ResponseEntity<List<EnvioConsolidadoDTO>> candidatosAvanceOperativo() {
        return ResponseEntity.ok(envioConsolidadoService.listarCandidatosAvanceOperativo().stream()
                .map(envio -> envioConsolidadoService.toDTO(envio, false))
                .toList());
    }

    @PostMapping("/preview-avance-operativo")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Previsualizar avance operativo",
            description = "Valida la selección y el destino y calcula los pasos operativos intermedios sin modificar datos")
    public ResponseEntity<AvanceOperativoConsolidadosPreviewDTO> previewAvanceOperativo(
            @Valid @RequestBody AvanceOperativoConsolidadosRequest request) {
        return ResponseEntity.ok(envioConsolidadoService.previewAvanceOperativo(request));
    }

    @PostMapping("/aplicar-avance-operativo")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    @Operation(summary = "Aplicar avance operativo",
            description = "Aplica atómicamente los pasos operativos intermedios del consolidado hasta el destino")
    public ResponseEntity<AvanceOperativoConsolidadosResponse> aplicarAvanceOperativo(
            @Valid @RequestBody AvanceOperativoConsolidadosRequest request) {
        return ResponseEntity.ok(envioConsolidadoService.aplicarAvanceOperativo(request));
    }

    @GetMapping(value = "/{id}/manifiesto.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_READ')")
    @Operation(summary = "Descargar manifiesto PDF", description = "Genera y descarga el manifiesto PDF de un envío consolidado")
    @ApiResponse(responseCode = "200", description = "Archivo PDF generado")
    public ResponseEntity<byte[]> manifiestoPdf(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.findById(id);
        byte[] pdf = manifiestoService.generarPdf(envio);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=manifiesto-" + envio.getCodigo() + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdf);
    }

    @GetMapping(value = "/{id}/manifiesto.xlsx",
            produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_READ')")
    @Operation(summary = "Descargar manifiesto Excel", description = "Genera y descarga el manifiesto Excel de un envío consolidado")
    @ApiResponse(responseCode = "200", description = "Archivo Excel generado")
    public ResponseEntity<byte[]> manifiestoXlsx(@Parameter(description = "ID del envío consolidado") @PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.findById(id);
        byte[] xlsx = manifiestoService.generarXlsx(envio);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=manifiesto-" + envio.getCodigo() + ".xlsx")
                .body(xlsx);
    }

    /**
     * Acepta los filtros del estado operativo derivado:
     * <ul>
     *   <li>{@code null} o vacio o {@code TODOS}: lista completa.</li>
     *   <li>{@code VACIO}, {@code EN_PREPARACION}, {@code ENVIADO_DESDE_USA},
     *       {@code RECIBIDO_EN_BODEGA}, {@code LIQUIDADO}: valores canónicos.</li>
     * </ul>
     */
    private EstadoEnvioConsolidadoOperativo parseEstadoOperativoFilter(String estado) {
        if (estado == null || estado.isBlank()) return null;
        String e = estado.trim().toUpperCase();
        return switch (e) {
            case "TODOS", "TODO" -> null;
            case "VACIO" -> EstadoEnvioConsolidadoOperativo.VACIO;
            case "EN_PREPARACION", "PREPARACION" -> EstadoEnvioConsolidadoOperativo.EN_PREPARACION;
            case "CERRADO" -> EstadoEnvioConsolidadoOperativo.CERRADO;
            case "ENVIADO_DESDE_USA", "ENVIADO_USA", "ENVIADOS_DESDE_USA" ->
                    EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA;
            case "ARRIBADO_ECUADOR", "ARRIBADO" -> EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR;
            case "RECIBIDO_EN_BODEGA", "RECIBIDO", "EN_BODEGA" ->
                    EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA;
            case "LIQUIDADO" -> EstadoEnvioConsolidadoOperativo.LIQUIDADO;
            case "CANCELADO" -> EstadoEnvioConsolidadoOperativo.CANCELADO;
            default -> throw new BadRequestException("Filtro no válido: " + estado
                    + ". Use TODOS, VACIO, EN_PREPARACION, CERRADO, ENVIADO_DESDE_USA, ARRIBADO_ECUADOR, RECIBIDO_EN_BODEGA, LIQUIDADO o CANCELADO.");
        };
    }

    private com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado parseEstadoPagoFilter(String estadoPago) {
        if (estadoPago == null || estadoPago.isBlank()) return null;
        String e = estadoPago.trim().toUpperCase();
        return switch (e) {
            case "TODOS", "TODO" -> null;
            case "PAGADO", "PAGADOS" -> com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado.PAGADO;
            case "NO_PAGADO", "NOPAGADO", "PENDIENTE" ->
                    com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado.NO_PAGADO;
            default -> throw new BadRequestException("Filtro de pago no válido: " + estadoPago
                    + ". Use TODOS, PAGADO o NO_PAGADO.");
        };
    }
}
