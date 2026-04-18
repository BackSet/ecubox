package com.ecubox.ecubox_backend.controller;

import com.ecubox.ecubox_backend.config.TrackingEtag;
import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.enums.TrackingTipo;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.service.PaqueteService;
import com.ecubox.ecubox_backend.service.TrackingResolverService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.concurrent.TimeUnit;

/**
 * Endpoint publico unificado de tracking.
 *
 * <ul>
 *   <li>{@code GET /api/v1/tracking?codigo=...} - resuelve por prioridad pieza ->
 *       guia master. El envio consolidado es interno del operario y NO se
 *       resuelve aqui.</li>
 *   <li>{@code GET /api/tracking?numeroGuia=...} - alias deprecated (compat) que solo
 *       devuelve la pieza individual; sera removido en una version futura.</li>
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
public class TrackingController {

    private final TrackingResolverService trackingResolverService;
    private final PaqueteService paqueteService;

    @Value("${tracking.cache.max-age-seconds:30}")
    private long cacheMaxAgeSeconds;

    @Value("${tracking.cache.stale-while-revalidate-seconds:60}")
    private long staleWhileRevalidateSeconds;

    public TrackingController(TrackingResolverService trackingResolverService,
                              PaqueteService paqueteService) {
        this.trackingResolverService = trackingResolverService;
        this.paqueteService = paqueteService;
    }

    /**
     * Endpoint v1 unificado.
     * Acepta {@code codigo} como nombre canonico y {@code numeroGuia} como alias
     * de compatibilidad para clientes existentes.
     */
    @GetMapping("/api/v1/tracking")
    public ResponseEntity<TrackingResolveResponse> resolve(
            @RequestParam(name = "codigo", required = false) String codigo,
            @RequestParam(name = "numeroGuia", required = false) String numeroGuia,
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

    /**
     * Endpoint legado: devuelve la pieza directamente para no romper integraciones
     * antiguas. Internamente puede delegar al resolver, pero seguimos devolviendo
     * el DTO plano {@link TrackingResponse} para mantener el contrato historico.
     *
     * @deprecated usa {@code /api/v1/tracking?codigo=...}
     */
    @Deprecated(since = "v1")
    @GetMapping("/api/tracking")
    public ResponseEntity<TrackingResponse> getByNumeroGuiaLegacy(
            @RequestParam(name = "numeroGuia") String numeroGuia,
            HttpServletRequest request) {
        TrackingResolveResponse resolved = trackingResolverService.resolve(numeroGuia);
        TrackingResponse pieza = resolved.getTipo() == TrackingTipo.PIEZA
                ? resolved.getPieza()
                : paqueteService.findByNumeroGuiaForTracking(numeroGuia);
        TrackingResolveResponse wrapper = TrackingResolveResponse.ofPieza(pieza);
        String etag = TrackingEtag.of(wrapper);
        if (matchesIfNoneMatch(request, etag)) {
            return notModified(etag);
        }
        return cacheable(ResponseEntity.ok(), etag).body(pieza);
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
