package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.dto.PaqueteCreateRequest;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.PaqueteResumenDTO;
import com.ecubox.ecubox_backend.dto.PaqueteUpdateRequest;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.PaqueteService;
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
import java.util.Map;

@Tag(name = "Cliente", description = "Gestión de paquetes del cliente")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/mis-paquetes")
public class PaqueteController {

    private final PaqueteService paqueteService;
    private final CurrentUserService currentUserService;

    public PaqueteController(PaqueteService paqueteService,
                              CurrentUserService currentUserService) {
        this.paqueteService = paqueteService;
        this.currentUserService = currentUserService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAQUETES_READ')")
    @Operation(summary = "Listar mis paquetes", description = "Obtiene los paquetes visibles para el usuario autenticado")
    @ApiResponse(responseCode = "200", description = "Listado de paquetes")
    public ResponseEntity<List<PaqueteDTO>> findAll() {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean canManageAny = currentUserService.hasAuthority("PAQUETES_OPERARIO");
        List<PaqueteDTO> list = canManageAny
                ? paqueteService.findAll()
                : paqueteService.findAllByUsuarioId(usuarioId);
        ocultarRevisionSinPermiso(list);
        return ResponseEntity.ok(list);
    }

    /**
     * Variante paginada con búsqueda libre + filtros estructurales. Sustituye al
     * GET plano cuando el frontend usa el patrón de listas grandes con paginación
     * servidor. El chip {@code vencidos} se sigue resolviendo en cliente.
     */
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('PAQUETES_READ')")
    @Operation(summary = "Listar paquetes paginados", description = "Consulta paquetes con búsqueda, filtros y paginación")
    @ApiResponse(responseCode = "200", description = "Página de paquetes")
    public ResponseEntity<PageResponse<PaqueteDTO>> findAllPage(
            @Parameter(description = "Texto de búsqueda libre") @RequestParam(required = false) String q,
            @Parameter(description = "Filtro por estado") @RequestParam(required = false) String estado,
            @Parameter(description = "ID de consignatario") @RequestParam(required = false) Long consignatarioId,
            @Parameter(description = "Filtro por tipo de envío") @RequestParam(required = false) String envio,
            @Parameter(description = "ID de guía master") @RequestParam(required = false) Long guiaMasterId,
            @Parameter(description = "Filtro por chip del frontend") @RequestParam(required = false) String chip,
            @Parameter(description = "Bandeja: todos, operativos o en_revision")
            @RequestParam(defaultValue = "todos") String bandeja,
            @Parameter(description = "Número de página (base cero)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Cantidad de elementos por página") @RequestParam(defaultValue = "25") int size) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean canManageAny = currentUserService.hasAuthority("PAQUETES_OPERARIO");
        var filters = new PaqueteService.PaqueteListFilters(
                estado, consignatarioId, envio, guiaMasterId, chip, bandeja);
        var pageResult = canManageAny
                ? paqueteService.findAllPaginated(q, filters, page, size)
                : paqueteService.findAllByUsuarioIdPaginated(usuarioId, q, filters, page, size);
        ocultarRevisionSinPermiso(pageResult.getContent());
        return ResponseEntity.ok(PageResponse.of(pageResult));
    }

    /**
     * Resumen liviano para el listado de paquetes: KPIs del universo, conteos por
     * chip (respetando filtros estructurales) y opciones distintas de filtro.
     * Evita que el cliente descargue el dataset completo solo para los KPIs,
     * comboboxes y chips; la tabla se sirve por {@code /page}.
     */
    @GetMapping("/resumen")
    @PreAuthorize("hasAuthority('PAQUETES_READ')")
    @Operation(summary = "Resumen del listado de paquetes", description = "KPIs, conteos por chip y opciones de filtro")
    @ApiResponse(responseCode = "200", description = "Resumen de paquetes")
    public ResponseEntity<PaqueteResumenDTO> resumen(
            @Parameter(description = "Texto de búsqueda libre") @RequestParam(required = false) String q,
            @Parameter(description = "Filtro por estado") @RequestParam(required = false) String estado,
            @Parameter(description = "ID de consignatario") @RequestParam(required = false) Long consignatarioId,
            @Parameter(description = "Filtro por tipo de envío") @RequestParam(required = false) String envio,
            @Parameter(description = "ID de guía master") @RequestParam(required = false) Long guiaMasterId,
            @Parameter(description = "Bandeja: todos, operativos o en_revision")
            @RequestParam(defaultValue = "todos") String bandeja) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean canManageAny = currentUserService.hasAuthority("PAQUETES_OPERARIO");
        boolean canReadRevision = currentUserService.hasAuthority("PAQUETES_REVISION_READ");
        var filters = new PaqueteService.PaqueteListFilters(
                estado, consignatarioId, envio, guiaMasterId, null, bandeja);
        var resumen = paqueteService.resumen(canManageAny ? null : usuarioId, q, filters, canReadRevision);
        return ResponseEntity.ok(resumen);
    }

    @GetMapping("/sugerir-ref")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Sugerir referencia de paquete", description = "Genera una referencia sugerida para un consignatario")
    @ApiResponse(responseCode = "200", description = "Referencia sugerida")
    public ResponseEntity<Map<String, String>> sugerirRef(
            @Parameter(description = "ID del consignatario") @RequestParam Long consignatarioId,
            @Parameter(description = "ID de paquete a excluir en edición") @RequestParam(required = false) Long excludePaqueteId) {
        String ref = paqueteService.sugerirRef(consignatarioId, excludePaqueteId);
        return ResponseEntity.ok(Map.of("ref", ref));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('PAQUETES_CREATE')")
    @Operation(summary = "Crear paquete", description = "Registra un nuevo paquete para el usuario autenticado")
    @ApiResponse(responseCode = "201", description = "Paquete creado")
    public ResponseEntity<PaqueteDTO> create(@Valid @RequestBody PaqueteCreateRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        boolean contenidoObligatorio = !currentUserService.hasAuthority("PAQUETES_PESO_WRITE");
        boolean canManageAny = currentUserService.hasAuthority("PAQUETES_OPERARIO");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(paqueteService.create(usuarioId, canManageAny, contenidoObligatorio, request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PAQUETES_UPDATE')")
    @Operation(summary = "Actualizar paquete", description = "Actualiza la información de un paquete existente")
    @ApiResponse(responseCode = "200", description = "Paquete actualizado")
    public ResponseEntity<PaqueteDTO> update(
            @Parameter(description = "ID del paquete") @PathVariable Long id,
            @Valid @RequestBody PaqueteUpdateRequest request) {
        var usuario = currentUserService.getCurrentUsuario();
        boolean canManageAny = currentUserService.hasAuthority("PAQUETES_OPERARIO");
        boolean canEditPeso = currentUserService.hasAuthority("PAQUETES_PESO_WRITE");
        return ResponseEntity.ok(paqueteService.update(id, usuario.getId(), canManageAny, canEditPeso, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('PAQUETES_DELETE')")
    @Operation(summary = "Eliminar paquete", description = "Elimina un paquete por su identificador")
    @ApiResponse(responseCode = "204", description = "Paquete eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del paquete") @PathVariable Long id) {
        var usuario = currentUserService.getCurrentUsuario();
        boolean canManageAny = currentUserService.hasAuthority("PAQUETES_OPERARIO");
        paqueteService.delete(id, usuario.getId(), canManageAny);
        return ResponseEntity.noContent().build();
    }

    private void ocultarRevisionSinPermiso(List<PaqueteDTO> paquetes) {
        if (!currentUserService.hasAuthority("PAQUETES_REVISION_READ")) {
            paquetes.forEach(paquete -> paquete.setRevisionActiva(null));
        }
    }
}
