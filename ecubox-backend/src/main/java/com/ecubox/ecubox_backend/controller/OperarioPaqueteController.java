package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.dto.AplicarEstadoPorPeriodoPaqueteRequest;
import com.ecubox.ecubox_backend.dto.AsignarGuiaMasterBulkRequest;
import com.ecubox.ecubox_backend.dto.BulkPaquetePesoRequest;
import com.ecubox.ecubox_backend.dto.BuscarPaquetesPorGuiasRequest;
import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoBulkRequest;
import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoBulkResponse;
import com.ecubox.ecubox_backend.dto.CambiarEstadoRastreoRequest;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadosDestinoPermitidosRequest;
import com.ecubox.ecubox_backend.dto.PaqueteAsignarSacaRequest;
import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.PaqueteGuiaMasterRequest;
import com.ecubox.ecubox_backend.service.PaqueteService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Operario", description = "Gestión operativa de paquetes")
@OpenApiConstants.StandardApiResponses
@SecurityRequirement(name = OpenApiConstants.BEARER_AUTH)
@RestController
@RequestMapping("/api/operario/paquetes")
public class OperarioPaqueteController {

    private final PaqueteService paqueteService;

    public OperarioPaqueteController(PaqueteService paqueteService) {
        this.paqueteService = paqueteService;
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Listar paquetes operativos", description = "Lista paquetes según filtros de peso, saca y vencimiento")
    @ApiResponse(responseCode = "200", description = "Listado de paquetes")
    public ResponseEntity<List<PaqueteDTO>> listar(
            @Parameter(description = "Filtrar paquetes sin peso registrado") @RequestParam(defaultValue = "true") boolean sinPeso,
            @Parameter(description = "Filtrar paquetes sin saca asignada") @RequestParam(defaultValue = "false") boolean sinSaca,
            @Parameter(description = "Filtrar paquetes vencidos para despacho") @RequestParam(defaultValue = "false") boolean vencidos) {
        if (vencidos) {
            return ResponseEntity.ok(paqueteService.listarVencidosParaOperario());
        }
        if (sinSaca) {
            return ResponseEntity.ok(paqueteService.listarSinSaca());
        }
        return ResponseEntity.ok(paqueteService.listarParaOperario(sinPeso));
    }

    @PatchMapping("/{paqueteId}/saca")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Asignar saca a paquete", description = "Asocia un paquete a una saca operativa")
    @ApiResponse(responseCode = "200", description = "Paquete actualizado")
    public ResponseEntity<PaqueteDTO> asignarSaca(
            @Parameter(description = "ID del paquete") @PathVariable Long paqueteId,
            @Valid @RequestBody PaqueteAsignarSacaRequest request) {
        return ResponseEntity.ok(paqueteService.asignarSaca(paqueteId, request.getSacaId()));
    }

    @PostMapping("/pesos")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Actualizar pesos en lote", description = "Actualiza el peso de múltiples paquetes en una sola operación")
    @ApiResponse(responseCode = "200", description = "Paquetes actualizados")
    public ResponseEntity<List<PaqueteDTO>> actualizarPesosBulk(
            @Valid @RequestBody BulkPaquetePesoRequest request) {
        return ResponseEntity.ok(paqueteService.actualizarPesosBulk(request.getItems()));
    }

    @PatchMapping("/{paqueteId}/estado-rastreo")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Cambiar estado de rastreo", description = "Actualiza el estado de rastreo de un paquete")
    @ApiResponse(responseCode = "200", description = "Paquete actualizado")
    public ResponseEntity<PaqueteDTO> cambiarEstadoRastreo(
            @Parameter(description = "ID del paquete") @PathVariable Long paqueteId,
            @Valid @RequestBody CambiarEstadoRastreoRequest request) {
        return ResponseEntity.ok(paqueteService.cambiarEstadoRastreo(paqueteId, request.getEstadoRastreoId(), request.getMotivoAlterno()));
    }

    @PostMapping("/estados-destino-permitidos")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Consultar estados destino permitidos", description = "Devuelve estados de rastreo válidos para los paquetes seleccionados")
    @ApiResponse(responseCode = "200", description = "Estados de destino permitidos")
    public ResponseEntity<List<EstadoRastreoDTO>> estadosDestinoPermitidos(
            @Valid @RequestBody EstadosDestinoPermitidosRequest request) {
        return ResponseEntity.ok(paqueteService.estadosDestinoPermitidos(request.getPaqueteIds()));
    }

    @PostMapping("/cambiar-estado-rastreo-bulk")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Cambiar estado masivo", description = "Aplica un estado de rastreo a múltiples paquetes")
    @ApiResponse(responseCode = "200", description = "Resultado del cambio masivo")
    public ResponseEntity<CambiarEstadoRastreoBulkResponse> cambiarEstadoRastreoBulk(
            @Valid @RequestBody CambiarEstadoRastreoBulkRequest request) {
        return ResponseEntity.ok(paqueteService.cambiarEstadoRastreoBulk(
                request.getPaqueteIds(), request.getEstadoRastreoId()));
    }

    @PatchMapping("/{paqueteId}/guia-master")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Asignar guía master a paquete", description = "Vincula un paquete individual a una guía master")
    @ApiResponse(responseCode = "200", description = "Paquete actualizado")
    public ResponseEntity<PaqueteDTO> asignarAGuiaMaster(
            @Parameter(description = "ID del paquete") @PathVariable Long paqueteId,
            @Valid @RequestBody PaqueteGuiaMasterRequest request) {
        return ResponseEntity.ok(paqueteService.asignarAGuiaMaster(
                paqueteId, request.getGuiaMasterId(), request.getPiezaNumero()));
    }

    @PostMapping("/asignar-guia-master")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Asignar guía master en lote", description = "Asocia una guía master a múltiples paquetes")
    @ApiResponse(responseCode = "200", description = "Paquetes actualizados")
    public ResponseEntity<List<PaqueteDTO>> asignarGuiaMasterBulk(
            @Valid @RequestBody AsignarGuiaMasterBulkRequest request) {
        return ResponseEntity.ok(paqueteService.asignarGuiaMasterBulk(
                request.getGuiaMasterId(), request.getPaqueteIds()));
    }

    @PostMapping("/buscar-por-guias")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Buscar paquetes por guías", description = "Busca paquetes usando una lista de números de guía")
    @ApiResponse(responseCode = "200", description = "Paquetes encontrados")
    public ResponseEntity<List<PaqueteDTO>> buscarPorGuias(
            @Valid @RequestBody BuscarPaquetesPorGuiasRequest request) {
        return ResponseEntity.ok(paqueteService.buscarPorNumeroGuias(request.getNumeroGuias()));
    }

    @GetMapping("/estados-aplicables")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Listar estados aplicables", description = "Obtiene estados de rastreo que pueden aplicarse manualmente a paquetes")
    @ApiResponse(responseCode = "200", description = "Listado de estados aplicables")
    public ResponseEntity<List<EstadoRastreoDTO>> estadosAplicables() {
        return ResponseEntity.ok(paqueteService.getEstadosAplicablesPaquete());
    }

    @PostMapping("/aplicar-estado-por-periodo")
    @PreAuthorize("hasAuthority('PAQUETES_PESO_WRITE')")
    @Operation(summary = "Aplicar estado por periodo", description = "Aplica un estado de rastreo a todos los paquetes registrados en el periodo indicado")
    @ApiResponse(responseCode = "200", description = "Resultado del cambio masivo")
    public ResponseEntity<CambiarEstadoRastreoBulkResponse> aplicarEstadoPorPeriodo(
            @Valid @RequestBody AplicarEstadoPorPeriodoPaqueteRequest request) {
        return ResponseEntity.ok(paqueteService.aplicarEstadoPorPeriodoPaquetes(
                request.getFechaInicio(), request.getFechaFin(), request.getEstadoRastreoId()));
    }

}
