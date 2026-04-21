package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateRequest;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoCreateResponse;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoDTO;
import com.ecubox.ecubox_backend.dto.EnvioConsolidadoPaquetesRequest;
import com.ecubox.ecubox_backend.dto.PageResponse;
import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.EnvioConsolidadoService;
import com.ecubox.ecubox_backend.service.ManifiestoEnvioConsolidadoService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<PageResponse<EnvioConsolidadoDTO>> findAll(
            @RequestParam(required = false) String estado,
            @RequestParam(required = false) String estadoPago,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Boolean cerradoFilter = parseEstadoFilter(estado);
        com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado pagoFilter = parseEstadoPagoFilter(estadoPago);
        Page<EnvioConsolidado> resultado = envioConsolidadoService.findAll(cerradoFilter, pagoFilter, q, page, size);
        return ResponseEntity.ok(PageResponse.of(resultado, e -> envioConsolidadoService.toDTO(e, false)));
    }

    /**
     * Lista los envios consolidados que pueden incluirse en un nuevo lote de
     * recepcion. A diferencia del listado general, no filtra por estado abierto
     * ni por estado de pago: un consolidado ya liquidado (PAGADO + CERRADO)
     * sigue siendo recepcionable mientras no haya llegado fisicamente. Los
     * envios sin paquetes y los que ya estan en algun lote de recepcion se
     * excluyen del resultado.
     */
    @GetMapping("/disponibles-recepcion")
    @PreAuthorize("hasAuthority('DESPACHOS_WRITE')")
    public ResponseEntity<PageResponse<EnvioConsolidadoDTO>> findDisponiblesParaRecepcion(
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        Page<EnvioConsolidado> resultado = envioConsolidadoService.findDisponiblesParaRecepcion(q, page, size);
        return ResponseEntity.ok(PageResponse.of(resultado, e -> envioConsolidadoService.toDTO(e, false)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_READ')")
    public ResponseEntity<EnvioConsolidadoDTO> findById(@PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.findById(id);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, true));
    }

    @PostMapping
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_CREATE')")
    public ResponseEntity<EnvioConsolidadoCreateResponse> crear(@Valid @RequestBody EnvioConsolidadoCreateRequest request) {
        Long usuarioId = currentUserService.getCurrentUsuario().getId();
        EnvioConsolidadoCreateResponse response = envioConsolidadoService.crearConGuias(
                request.getCodigo(),
                request.getNumerosGuia(),
                usuarioId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/{id}/cerrar")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    public ResponseEntity<EnvioConsolidadoDTO> cerrar(@PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.cerrar(id, null);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, false));
    }

    @PostMapping("/{id}/reabrir")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    public ResponseEntity<EnvioConsolidadoDTO> reabrir(@PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.reabrir(id);
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, false));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_DELETE')")
    public ResponseEntity<Void> eliminar(@PathVariable Long id,
                                         @RequestParam(name = "eliminarPaquetes",
                                                       defaultValue = "false") boolean eliminarPaquetes) {
        envioConsolidadoService.eliminar(id, eliminarPaquetes);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/paquetes")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    public ResponseEntity<EnvioConsolidadoDTO> agregarPaquetes(@PathVariable Long id,
                                                               @Valid @RequestBody EnvioConsolidadoPaquetesRequest request) {
        EnvioConsolidado envio = envioConsolidadoService.agregarPaquetes(id, request.getPaqueteIds());
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, true));
    }

    @DeleteMapping("/{id}/paquetes")
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_UPDATE')")
    public ResponseEntity<EnvioConsolidadoDTO> removerPaquetes(@PathVariable Long id,
                                                               @Valid @RequestBody EnvioConsolidadoPaquetesRequest request) {
        EnvioConsolidado envio = envioConsolidadoService.removerPaquetes(id, request.getPaqueteIds());
        return ResponseEntity.ok(envioConsolidadoService.toDTO(envio, true));
    }

    @GetMapping(value = "/{id}/manifiesto.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PreAuthorize("hasAuthority('ENVIOS_CONSOLIDADOS_READ')")
    public ResponseEntity<byte[]> manifiestoPdf(@PathVariable Long id) {
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
    public ResponseEntity<byte[]> manifiestoXlsx(@PathVariable Long id) {
        EnvioConsolidado envio = envioConsolidadoService.findById(id);
        byte[] xlsx = manifiestoService.generarXlsx(envio);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=manifiesto-" + envio.getCodigo() + ".xlsx")
                .body(xlsx);
    }

    /**
     * Acepta los filtros simples del nuevo modelo (sin maquina de estados):
     * <ul>
     *   <li>{@code null} o vacio o {@code TODOS}: lista completa.</li>
     *   <li>{@code ABIERTO} / {@code ABIERTOS}: solo envios sin {@code fecha_cerrado}.</li>
     *   <li>{@code CERRADO} / {@code CERRADOS} / {@code CERRADA}: solo envios con {@code fecha_cerrado}.</li>
     * </ul>
     */
    private Boolean parseEstadoFilter(String estado) {
        if (estado == null || estado.isBlank()) return null;
        String e = estado.trim().toUpperCase();
        return switch (e) {
            case "TODOS", "TODO" -> null;
            case "ABIERTO", "ABIERTOS" -> Boolean.FALSE;
            case "CERRADO", "CERRADOS", "CERRADA" -> Boolean.TRUE;
            default -> throw new BadRequestException("Filtro no válido: " + estado
                    + ". Use TODOS, ABIERTO o CERRADO.");
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
