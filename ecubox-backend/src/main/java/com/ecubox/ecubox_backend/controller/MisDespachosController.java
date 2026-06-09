package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.MiDespachoDTO;
import com.ecubox.ecubox_backend.dto.MiDespachoDetalleDTO;
import com.ecubox.ecubox_backend.service.MisDespachosService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Endpoints para que el cliente (o quien entra por enlace mágico) vea los
 * despachos que contienen sus piezas y confirme la entrega de su parte.
 */
@Tag(name = "Cliente", description = "Despachos y confirmación de entrega del cliente")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/mis-despachos")
public class MisDespachosController {

    private final MisDespachosService misDespachosService;

    public MisDespachosController(MisDespachosService misDespachosService) {
        this.misDespachosService = misDespachosService;
    }

    @GetMapping
    @PreAuthorize("hasAnyAuthority('MIS_ENTREGAS_READ', 'ACCESO_ENLACE_MIS_ENTREGAS_READ')")
    @Operation(summary = "Mis despachos", description = "Lista los despachos con las piezas del cliente y si puede confirmar la entrega")
    @ApiResponse(responseCode = "200", description = "Listado de despachos del cliente")
    public ResponseEntity<List<MiDespachoDTO>> listar() {
        return ResponseEntity.ok(misDespachosService.listar());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyAuthority('MIS_ENTREGAS_READ', 'ACCESO_ENLACE_MIS_ENTREGAS_READ')")
    @Operation(summary = "Detalle de mi despacho", description = "Detalle del despacho con las piezas del cliente")
    @ApiResponse(responseCode = "200", description = "Detalle del despacho")
    public ResponseEntity<MiDespachoDetalleDTO> detalle(
            @Parameter(description = "ID del despacho") @PathVariable Long id) {
        return ResponseEntity.ok(misDespachosService.detalle(id));
    }

    @PostMapping("/{id}/confirmar-entrega")
    @PreAuthorize("hasAuthority('MIS_ENTREGAS_CONFIRM')")
    @Operation(summary = "Confirmar entrega", description = "El cliente confirma la recepción de sus piezas en el despacho indicado")
    @ApiResponse(responseCode = "200", description = "Despacho actualizado tras la confirmación")
    public ResponseEntity<MiDespachoDTO> confirmarEntrega(
            @Parameter(description = "ID del despacho") @PathVariable Long id) {
        return ResponseEntity.ok(misDespachosService.confirmarEntrega(id));
    }
}
