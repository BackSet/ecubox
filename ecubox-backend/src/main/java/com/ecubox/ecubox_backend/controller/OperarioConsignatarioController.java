package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AsignarConsignatariosClienteRequest;
import com.ecubox.ecubox_backend.dto.ConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.ConsignatarioRequest;
import com.ecubox.ecubox_backend.dto.UsuarioDTO;
import com.ecubox.ecubox_backend.service.ConsignatarioService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@Tag(name = "Operario", description = "Gestión operativa de consignatarios")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/consignatarios")
public class OperarioConsignatarioController {

    private final ConsignatarioService consignatarioService;

    public OperarioConsignatarioController(ConsignatarioService consignatarioService) {
        this.consignatarioService = consignatarioService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    @Operation(summary = "Listar consignatarios", description = "Obtiene consignatarios para gestión operativa")
    @ApiResponse(responseCode = "200", description = "Listado de consignatarios")
    public ResponseEntity<List<ConsignatarioDTO>> findAll(
            @Parameter(description = "Texto de búsqueda por nombre, código o documento") @RequestParam(required = false) String search) {
        return ResponseEntity.ok(consignatarioService.findAllForOperario(search));
    }

    @GetMapping("/clientes")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    @Operation(summary = "Listar clientes asignables", description = "Obtiene usuarios cliente para asociarlos a consignatarios")
    @ApiResponse(responseCode = "200", description = "Listado de clientes")
    public ResponseEntity<List<UsuarioDTO>> findClientes() {
        return ResponseEntity.ok(consignatarioService.findClientesForOperario());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    @Operation(summary = "Obtener consignatario por ID", description = "Consulta el detalle de un consignatario para operación")
    @ApiResponse(responseCode = "200", description = "Consignatario encontrado")
    public ResponseEntity<ConsignatarioDTO> findById(@Parameter(description = "ID del consignatario") @PathVariable Long id) {
        return ResponseEntity.ok(consignatarioService.findById(id));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    @Operation(summary = "Crear consignatario", description = "Crea un consignatario operativo, opcionalmente asociado a un cliente real")
    @ApiResponse(responseCode = "201", description = "Consignatario creado")
    public ResponseEntity<ConsignatarioDTO> create(@Valid @RequestBody ConsignatarioRequest request) {
        return ResponseEntity.status(org.springframework.http.HttpStatus.CREATED)
                .body(consignatarioService.createByOperario(request));
    }

    @PatchMapping("/asignar-cliente")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    @Operation(summary = "Asignar cliente a consignatarios", description = "Asocia varios consignatarios al cliente real indicado")
    @ApiResponse(responseCode = "200", description = "Consignatarios actualizados")
    public ResponseEntity<List<ConsignatarioDTO>> asignarCliente(
            @Valid @RequestBody AsignarConsignatariosClienteRequest request) {
        return ResponseEntity.ok(consignatarioService.asignarClienteByOperario(
                request.getClienteUsuarioId(), request.getConsignatarioIds()));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    @Operation(summary = "Actualizar consignatario", description = "Actualiza la información de un consignatario en flujo operativo")
    @ApiResponse(responseCode = "200", description = "Consignatario actualizado")
    public ResponseEntity<ConsignatarioDTO> update(
            @Parameter(description = "ID del consignatario") @PathVariable Long id,
            @Valid @RequestBody ConsignatarioRequest request) {
        return ResponseEntity.ok(consignatarioService.updateByOperario(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('CONSIGNATARIOS_OPERARIO')")
    @Operation(summary = "Eliminar consignatario", description = "Elimina un consignatario desde el módulo operativo")
    @ApiResponse(responseCode = "204", description = "Consignatario eliminado")
    public ResponseEntity<Void> delete(@Parameter(description = "ID del consignatario") @PathVariable Long id) {
        consignatarioService.deleteByOperario(id);
        return ResponseEntity.noContent().build();
    }
}
