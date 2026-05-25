package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AplicarEstadoEnDespachosRequest;
import com.ecubox.ecubox_backend.dto.AplicarEstadoPorPeriodoRequest;
import com.ecubox.ecubox_backend.dto.AplicarEstadoPorPeriodoResponse;
import com.ecubox.ecubox_backend.dto.DespachoCreateRequest;
import com.ecubox.ecubox_backend.dto.DespachoDTO;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoGeneradoDTO;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.service.DespachoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Operario", description = "Gestión operativa de despachos")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/despachos")
public class OperarioDespachoController {

    private final DespachoService despachoService;

    public OperarioDespachoController(DespachoService despachoService) {
        this.despachoService = despachoService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Listar despachos", description = "Obtiene todos los despachos operativos")
    @ApiResponse(responseCode = "200", description = "Listado de despachos")
    public ResponseEntity<List<DespachoDTO>> findAll() {
        return ResponseEntity.ok(despachoService.findAll());
    }

    /** Variante paginada con búsqueda libre. */
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Listar despachos paginados", description = "Consulta despachos con búsqueda libre y paginación")
    @ApiResponse(responseCode = "200", description = "Página de despachos")
    public ResponseEntity<PageResponse<DespachoDTO>> findAllPage(
            @Parameter(description = "Texto de búsqueda") @RequestParam(required = false) String q,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "25") int size) {
        return ResponseEntity.ok(PageResponse.of(despachoService.findAllPaginated(q, page, size)));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Crear despacho", description = "Registra un nuevo despacho")
    @ApiResponse(responseCode = "201", description = "Despacho creado")
    public ResponseEntity<DespachoDTO> create(@Valid @RequestBody DespachoCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(despachoService.create(request));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Obtener despacho por ID", description = "Devuelve el detalle de un despacho específico")
    @ApiResponse(responseCode = "200", description = "Despacho encontrado")
    public ResponseEntity<DespachoDTO> findById(@Parameter(description = "ID del despacho") @PathVariable Long id) {
        return ResponseEntity.ok(despachoService.findById(id));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Actualizar despacho", description = "Modifica los datos de un despacho existente")
    @ApiResponse(responseCode = "200", description = "Despacho actualizado")
    public ResponseEntity<DespachoDTO> update(
            @Parameter(description = "ID del despacho") @PathVariable Long id,
            @Valid @RequestBody DespachoCreateRequest request) {
        return ResponseEntity.ok(despachoService.update(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Eliminar despacho", description = "Elimina un despacho por su identificador")
    @ApiResponse(responseCode = "204", description = "Despacho eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del despacho") @PathVariable Long id) {
        despachoService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/aplicar-estado-por-periodo")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Aplicar estado por período", description = "Aplica un estado de rastreo a despachos dentro de un rango de fechas")
    @ApiResponse(responseCode = "200", description = "Resultado de aplicación masiva")
    public ResponseEntity<AplicarEstadoPorPeriodoResponse> aplicarEstadoPorPeriodo(
            @Valid @RequestBody AplicarEstadoPorPeriodoRequest request) {
        return ResponseEntity.ok(despachoService.aplicarEstadoRastreoPorPeriodo(
                request.getFechaInicio(),
                request.getFechaFin(),
                request.getEstadoRastreoId()));
    }

    @PostMapping("/aplicar-estado-en-despachos")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Aplicar estado en despachos", description = "Aplica un estado de rastreo a una lista explícita de despachos")
    @ApiResponse(responseCode = "200", description = "Resultado de aplicación por selección")
    public ResponseEntity<AplicarEstadoPorPeriodoResponse> aplicarEstadoEnDespachos(
            @Valid @RequestBody AplicarEstadoEnDespachosRequest request) {
        return ResponseEntity.ok(despachoService.aplicarEstadoRastreoEnDespachos(
                request.getDespachoIds(),
                request.getEstadoRastreoId()));
    }

    @GetMapping("/estados-aplicables")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Listar estados aplicables", description = "Obtiene estados de rastreo permitidos para despachos")
    @ApiResponse(responseCode = "200", description = "Listado de estados aplicables")
    public ResponseEntity<List<EstadoRastreoDTO>> estadosAplicables() {
        return ResponseEntity.ok(despachoService.listarEstadosPosterioresADespacho());
    }

    @GetMapping("/{id}/mensaje-whatsapp")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    @Operation(summary = "Generar mensaje WhatsApp", description = "Genera el texto de WhatsApp para un despacho específico")
    @ApiResponse(responseCode = "200", description = "Mensaje generado")
    public ResponseEntity<MensajeWhatsAppDespachoGeneradoDTO> getMensajeWhatsApp(
            @Parameter(description = "ID del despacho") @PathVariable Long id) {
        return ResponseEntity.ok(despachoService.getMensajeWhatsAppParaDespacho(id));
    }
}
