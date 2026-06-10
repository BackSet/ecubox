package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.GuiaMasterCancelarRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterCerrarConFaltanteRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterConfirmarDespachoParcialRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterCreateRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterDashboardDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterEstadoHistorialDTO;
import com.ecubox.ecubox_backend.dto.GuiaMasterReabrirRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterRevisionRequest;
import com.ecubox.ecubox_backend.dto.GuiaMasterUpdateRequest;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.entity.GuiaMaster;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.EstadoGuiaMaster;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.GuiaMasterService;
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

import java.util.ArrayList;
import java.util.EnumSet;
import java.util.List;
import java.util.Set;

@Tag(name = "Administración", description = "Gestión administrativa de guías master")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/guias-master")
public class GuiaMasterController {

    private final GuiaMasterService guiaMasterService;
    private final PaqueteService paqueteService;
    private final CurrentUserService currentUserService;

    public GuiaMasterController(GuiaMasterService guiaMasterService,
                                PaqueteService paqueteService,
                                CurrentUserService currentUserService) {
        this.guiaMasterService = guiaMasterService;
        this.paqueteService = paqueteService;
        this.currentUserService = currentUserService;
    }

    @PostMapping
    @PreAuthorize("hasAuthority('GUIAS_MASTER_CREATE')")
    @Operation(summary = "Crear guía master", description = "Registra una nueva guía master con su tracking base")
    @ApiResponse(responseCode = "201", description = "Guía master creada")
    public ResponseEntity<GuiaMasterDTO> create(@Valid @RequestBody GuiaMasterCreateRequest request) {
        GuiaMaster gm = guiaMasterService.create(
                request.getTrackingBase(),
                request.getTotalPiezasEsperadas(),
                request.getConsignatarioId());
        return ResponseEntity.status(HttpStatus.CREATED).body(construirDTO(gm, false));
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Actualizar guía master", description = "Actualiza la información editable de una guía master")
    @ApiResponse(responseCode = "200", description = "Guía master actualizada")
    public ResponseEntity<GuiaMasterDTO> update(@PathVariable Long id,
                                                @Valid @RequestBody GuiaMasterUpdateRequest request) {
        GuiaMaster gm = guiaMasterService.update(id, request);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_DELETE')")
    @Operation(summary = "Eliminar guía master", description = "Elimina una guía master por su identificador")
    @ApiResponse(responseCode = "204", description = "Guía master eliminada")
    public ResponseEntity<Void> delete(@Parameter(description = "ID de la guía master") @PathVariable Long id) {
        guiaMasterService.delete(id);
        return ResponseEntity.noContent().build();
    }

    /**
     * Listado de guias master. Soporta:
     * <ul>
     *   <li>{@code trackingBase}: busqueda exacta (devuelve 0 o 1 elemento).</li>
     *   <li>{@code estado}: uno o varios estados (separados por comas o repetido).</li>
     * </ul>
     * Si no se pasa filtro, devuelve todas (compatibilidad).
     */
    @GetMapping
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    @Operation(summary = "Listar guías master", description = "Consulta guías master por tracking exacto o por estados")
    @ApiResponse(responseCode = "200", description = "Listado de guías master")
    public ResponseEntity<List<GuiaMasterDTO>> findAll(@RequestParam(required = false) String trackingBase,
                                                       @RequestParam(name = "estado", required = false) List<String> estados) {
        if (trackingBase != null && !trackingBase.isBlank()) {
            GuiaMaster gm = guiaMasterService.findByTrackingBase(trackingBase);
            return ResponseEntity.ok(List.of(construirDTO(gm, true)));
        }
        Set<EstadoGuiaMaster> filtro = parseEstados(estados);
        List<GuiaMaster> lista;
        if (filtro != null && !filtro.isEmpty()) {
            lista = guiaMasterService.findByEstados(filtro);
        } else {
            lista = guiaMasterService.findAll();
        }
        return ResponseEntity.ok(lista.stream()
                .map(gm -> construirDTO(gm, false))
                .toList());
    }

    /**
     * Variante paginada con búsqueda libre. Sustituye al GET plano cuando el
     * frontend usa el patrón de listas grandes con paginación servidor.
     * Soporta el mismo filtro de {@code estado} (uno o varios, separados por comas).
     */
    @GetMapping("/page")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    @Operation(summary = "Listar guías master paginadas", description = "Consulta guías master con búsqueda libre, estados y paginación")
    @ApiResponse(responseCode = "200", description = "Página de guías master")
    public ResponseEntity<PageResponse<GuiaMasterDTO>> findAllPage(
            @RequestParam(required = false) String q,
            @RequestParam(name = "estado", required = false) List<String> estados,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Set<EstadoGuiaMaster> filtro = parseEstados(estados);
        var pageResult = guiaMasterService.findAllPaginated(q, filtro, page, size);
        return ResponseEntity.ok(PageResponse.of(pageResult, gm -> construirDTO(gm, false)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    @Operation(summary = "Obtener guía master por ID", description = "Devuelve el detalle de una guía master")
    @ApiResponse(responseCode = "200", description = "Guía master encontrada")
    public ResponseEntity<GuiaMasterDTO> findById(@Parameter(description = "ID de la guía master") @PathVariable Long id) {
        GuiaMaster gm = guiaMasterService.findById(id);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @GetMapping("/{id}/piezas")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    @Operation(summary = "Listar piezas de guía master", description = "Obtiene las piezas asociadas a una guía master")
    @ApiResponse(responseCode = "200", description = "Listado de piezas")
    public ResponseEntity<List<PaqueteDTO>> listarPiezas(@Parameter(description = "ID de la guía master") @PathVariable Long id) {
        List<Paquete> piezas = guiaMasterService.listarPiezas(id);
        return ResponseEntity.ok(piezas.stream().map(paqueteService::toDTO).toList());
    }

    @PostMapping("/{id}/cerrar-con-faltante")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Cerrar guía con faltante", description = "Cierra la guía master registrando faltantes")
    @ApiResponse(responseCode = "200", description = "Guía master cerrada")
    public ResponseEntity<GuiaMasterDTO> cerrarConFaltante(@PathVariable Long id,
                                                           @RequestBody(required = false) GuiaMasterCerrarConFaltanteRequest request) {
        String motivo = request != null ? request.getMotivo() : null;
        Long actorId = actorIdSafe();
        GuiaMaster gm = guiaMasterService.cerrarConFaltante(id, motivo, actorId, null);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @PostMapping("/{id}/cancelar")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Cancelar guía master", description = "Cancela una guía master indicando motivo")
    @ApiResponse(responseCode = "200", description = "Guía master cancelada")
    public ResponseEntity<GuiaMasterDTO> cancelar(@PathVariable Long id,
                                                  @Valid @RequestBody GuiaMasterCancelarRequest request) {
        Long actorId = actorIdSafe();
        GuiaMaster gm = guiaMasterService.cancelar(id, request.getMotivo(), actorId);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @PostMapping("/{id}/aprobar")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Aprobar guía master", description = "Aprueba una guía en PENDIENTE_VERIFICACION o EN_REVISION y recalcula su estado derivado")
    @ApiResponse(responseCode = "200", description = "Guía master aprobada")
    public ResponseEntity<GuiaMasterDTO> aprobar(@PathVariable Long id) {
        Long actorId = actorIdSafe();
        GuiaMaster gm = guiaMasterService.aprobar(id, actorId);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @PostMapping("/{id}/marcar-en-revision")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Marcar guía en revisión", description = "Cambia el estado de la guía master a revisión")
    @ApiResponse(responseCode = "200", description = "Guía master actualizada")
    public ResponseEntity<GuiaMasterDTO> marcarEnRevision(@PathVariable Long id,
                                                          @RequestBody(required = false) GuiaMasterRevisionRequest request) {
        String motivo = request != null ? request.getMotivo() : null;
        Long actorId = actorIdSafe();
        GuiaMaster gm = guiaMasterService.marcarEnRevision(id, motivo, actorId);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @PostMapping("/{id}/salir-de-revision")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Salir de revisión", description = "Retira una guía master del estado en revisión")
    @ApiResponse(responseCode = "200", description = "Guía master actualizada")
    public ResponseEntity<GuiaMasterDTO> salirDeRevision(@PathVariable Long id,
                                                         @RequestBody(required = false) GuiaMasterRevisionRequest request) {
        String motivo = request != null ? request.getMotivo() : null;
        Long actorId = actorIdSafe();
        GuiaMaster gm = guiaMasterService.salirDeRevision(id, motivo, actorId);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @PostMapping("/{id}/reabrir")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Reabrir guía master", description = "Reabre una guía master cerrada o cancelada")
    @ApiResponse(responseCode = "200", description = "Guía master reabierta")
    public ResponseEntity<GuiaMasterDTO> reabrir(@PathVariable Long id,
                                                 @Valid @RequestBody GuiaMasterReabrirRequest request) {
        Long actorId = actorIdSafe();
        GuiaMaster gm = guiaMasterService.reabrir(id, request.getMotivo(), actorId);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @GetMapping("/{id}/historial")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    @Operation(summary = "Consultar historial de guía", description = "Obtiene el historial de cambios de estado de una guía master")
    @ApiResponse(responseCode = "200", description = "Historial de estados")
    public ResponseEntity<List<GuiaMasterEstadoHistorialDTO>> historial(@Parameter(description = "ID de la guía master") @PathVariable Long id) {
        return ResponseEntity.ok(guiaMasterService.listarHistorialDTO(id));
    }

    /**
     * Recalcula el estado derivado de la guia. Antes este endpoint se
     * exponia con permiso de lectura aunque escribia en BD; a partir de
     * V66 requiere el permiso de actualizacion.
     */
    @PostMapping("/{id}/recalcular")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Recalcular estado de guía", description = "Recalcula y persiste el estado derivado de una guía master")
    @ApiResponse(responseCode = "200", description = "Guía master recalculada")
    public ResponseEntity<GuiaMasterDTO> recalcular(@Parameter(description = "ID de la guía master") @PathVariable Long id) {
        guiaMasterService.recomputarEstado(id);
        GuiaMaster gm = guiaMasterService.findById(id);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @PostMapping("/{id}/confirmar-despacho-parcial")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_UPDATE')")
    @Operation(summary = "Confirmar despacho parcial", description = "Confirma despacho parcial de una guía master")
    @ApiResponse(responseCode = "200", description = "Guía master actualizada")
    public ResponseEntity<GuiaMasterDTO> confirmarDespachoParcial(
            @Parameter(description = "ID de la guía master") @PathVariable Long id,
            @RequestBody(required = false) GuiaMasterConfirmarDespachoParcialRequest request) {
        Long actorId = currentUserService.getCurrentUsuario().getId();
        Long piezaId = request != null ? request.getPiezaId() : null;
        String motivo = request != null ? request.getMotivo() : null;
        GuiaMaster gm = guiaMasterService.confirmarDespachoParcial(id, piezaId, motivo, actorId);
        return ResponseEntity.ok(construirDTO(gm, true));
    }

    @GetMapping("/dashboard")
    @PreAuthorize("hasAuthority('GUIAS_MASTER_READ')")
    @Operation(summary = "Obtener dashboard de guías", description = "Devuelve métricas y panel resumido de guías master")
    @ApiResponse(responseCode = "200", description = "Dashboard de guías")
    public ResponseEntity<GuiaMasterDashboardDTO> dashboard(
            @RequestParam(defaultValue = "10") int topAntiguas) {
        return ResponseEntity.ok(guiaMasterService.buildDashboard(topAntiguas));
    }

    // -----------------------------------------------------------------
    // Helpers
    // -----------------------------------------------------------------

    private GuiaMasterDTO construirDTO(GuiaMaster gm, boolean incluirPiezas) {
        if (gm == null) {
            throw new ResourceNotFoundException("Guía master", "?");
        }
        List<PaqueteDTO> piezasDTO = List.of();
        if (incluirPiezas) {
            piezasDTO = guiaMasterService.listarPiezas(gm.getId()).stream()
                    .map(paqueteService::toDTO)
                    .toList();
        }
        return guiaMasterService.toDTO(gm, piezasDTO);
    }

    private Long actorIdSafe() {
        try {
            return currentUserService.getCurrentUsuario().getId();
        } catch (Exception ex) {
            return null;
        }
    }

    /**
     * Acepta varios formatos de query string:
     * <ul>
     *   <li>{@code ?estado=DESPACHO_PARCIAL&estado=EN_REVISION}</li>
     *   <li>{@code ?estado=DESPACHO_PARCIAL,EN_REVISION}</li>
     * </ul>
     */
    private Set<EstadoGuiaMaster> parseEstados(List<String> raw) {
        if (raw == null || raw.isEmpty()) return null;
        List<String> tokens = new ArrayList<>();
        for (String r : raw) {
            if (r == null) continue;
            for (String t : r.split(",")) {
                String trimmed = t.trim();
                if (!trimmed.isEmpty()) tokens.add(trimmed);
            }
        }
        if (tokens.isEmpty()) return null;
        Set<EstadoGuiaMaster> out = EnumSet.noneOf(EstadoGuiaMaster.class);
        for (String t : tokens) {
            try {
                out.add(EstadoGuiaMaster.valueOf(t.toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new BadRequestException("Estado de guia desconocido: " + t);
            }
        }
        return out;
    }
}
