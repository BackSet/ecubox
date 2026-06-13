package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.OpenApiConstants;
import com.ecubox.ecubox_backend.config.TrackingEtag;
import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.dto.TrackingExampleItemDTO;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.service.TrackingResolverService;
import com.ecubox.ecubox_backend.service.TrackingExampleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;
import java.util.List;

/**
 * Endpoint publico unificado de tracking.
 *
 * <ul>
 *   <li>{@code GET /api/v1/tracking?codigo=...} - resuelve por prioridad pieza ->
 *       guia master. El envio consolidado es interno del operario y NO se
 *       resuelve aqui.</li>
 * </ul>
 *
 * Caracteristicas HTTP:
 * <ul>
 *   <li>{@code ETag} estable derivado de campos identificadores y soporte de
 *       {@code If-None-Match} -> 304 Not Modified.</li>
 *   <li>{@code Cache-Control: public, max-age=N, stale-while-revalidate=N} configurable.</li>
 * </ul>
 */
@RestController
@Tag(name = "Público", description = "Rastreo público de envíos")
@OpenApiConstants.StandardApiResponses
public class TrackingController {

    private final TrackingResolverService trackingResolverService;
    private final TrackingExampleService trackingExampleService;

    @Value("${tracking.cache.max-age-seconds:30}")
    private long cacheMaxAgeSeconds;

    @Value("${tracking.cache.stale-while-revalidate-seconds:60}")
    private long staleWhileRevalidateSeconds;

    public TrackingController(TrackingResolverService trackingResolverService,
                              TrackingExampleService trackingExampleService) {
        this.trackingResolverService = trackingResolverService;
        this.trackingExampleService = trackingExampleService;
    }

    /**
     * Endpoint v1 unificado.
     * Acepta {@code codigo} como nombre canonico y {@code numeroGuia} como alias
     * de compatibilidad para clientes existentes.
     */
    @Operation(
            summary = "Resolver tracking",
            description = "Consulta el estado de una pieza o guía master por código. Soporta ETag e If-None-Match (304)."
    )
    @SecurityRequirements
    @ApiResponse(responseCode = "200", description = "Información de tracking")
    @ApiResponse(responseCode = "304", description = "Sin cambios desde la última consulta")
    @GetMapping("/api/v1/tracking")
    public ResponseEntity<TrackingResolveResponse> resolve(
            @Parameter(description = "Código de pieza o guía master") @RequestParam(name = "codigo", required = false) String codigo,
            @Parameter(description = "Alias de compatibilidad para codigo") @RequestParam(name = "numeroGuia", required = false) String numeroGuia,
            HttpServletRequest request) {
        String input = firstNonBlank(codigo, numeroGuia);
        if (input == null) {
            throw new BadRequestException("Debes indicar el parametro 'codigo'");
        }
        TrackingResolveResponse body = trackingResolverService.resolve(input);
        String etag = TrackingEtag.of(body);
        if (matchesIfNoneMatch(request, etag)) {
            return notModified(etag);
        }
        return cacheable(ResponseEntity.ok(), etag).body(body);
    }

    @Operation(summary = "Listar ejemplos de tracking")
    @SecurityRequirements
    @GetMapping("/api/v1/tracking/examples")
    public ResponseEntity<List<TrackingExampleItemDTO>> listExamples() {
        return cacheable(ResponseEntity.ok(), null).body(trackingExampleService.listar());
    }

    @Operation(summary = "Resolver ejemplo de tracking")
    @SecurityRequirements
    @GetMapping("/api/v1/tracking/examples/{codigo}")
    public ResponseEntity<TrackingResolveResponse> resolveExample(
            @PathVariable String codigo,
            HttpServletRequest request) {
        TrackingResolveResponse body = trackingExampleService.resolver(codigo);
        String etag = TrackingEtag.of(body);
        if (matchesIfNoneMatch(request, etag)) {
            return notModified(etag);
        }
        return cacheable(ResponseEntity.ok(), etag).body(body);
    }

    private boolean matchesIfNoneMatch(HttpServletRequest request, String etag) {
        if (etag == null) return false;
        String header = request.getHeader(HttpHeaders.IF_NONE_MATCH);
        if (header == null || header.isBlank()) return false;
        for (String token : header.split(",")) {
            String t = token.trim();
            if (t.equals("*") || t.equals(etag)) {
                return true;
            }
        }
        return false;
    }

    private <T> ResponseEntity.BodyBuilder cacheable(ResponseEntity.BodyBuilder builder, String etag) {
        CacheControl cc = CacheControl.maxAge(cacheMaxAgeSeconds, TimeUnit.SECONDS)
                .cachePublic()
                .staleWhileRevalidate(staleWhileRevalidateSeconds, TimeUnit.SECONDS);
        builder.cacheControl(cc);
        if (etag != null) {
            builder.eTag(etag);
        }
        return builder;
    }

    private <T> ResponseEntity<T> notModified(String etag) {
        ResponseEntity.BodyBuilder b = ResponseEntity.status(HttpStatus.NOT_MODIFIED);
        return cacheable(b, etag).<T>build();
    }

    private static String firstNonBlank(String... values) {
        if (values == null) return null;
        for (String v : values) {
            if (v != null && !v.isBlank()) return v.trim();
        }
        return null;
    }
}
