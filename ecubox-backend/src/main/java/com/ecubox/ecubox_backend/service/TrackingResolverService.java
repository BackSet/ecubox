package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.TrackingMasterResponse;
import com.ecubox.ecubox_backend.dto.TrackingResolveResponse;
import com.ecubox.ecubox_backend.dto.TrackingResponse;
import com.ecubox.ecubox_backend.entity.TrackingViewPaquete;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.TrackingViewPaqueteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Resuelve un codigo arbitrario hacia uno de los dos tipos de tracking publico
 * (pieza individual o guia master), por orden de prioridad.
 *
 * <p>Orden:
 * <ol>
 *   <li>{@code paquete.numero_guia} (case-insensitive)</li>
 *   <li>{@code guia_master.tracking_base} (case-insensitive)</li>
 * </ol>
 *
 * <p>El envio consolidado NO se resuelve aqui: es un agrupador interno del
 * operario y nunca debe aparecer en el tracking publico.
 *
 * <p>Si nada coincide, lanza {@link ResourceNotFoundException}, que el
 * controlador traduce a 404.
 */
@Service
public class TrackingResolverService {

    private static final Logger log = LoggerFactory.getLogger(TrackingResolverService.class);

    private final PaqueteService paqueteService;
    private final GuiaMasterService guiaMasterService;
    private final TrackingViewPaqueteRepository trackingViewRepository;

    public TrackingResolverService(PaqueteService paqueteService,
                                   GuiaMasterService guiaMasterService,
                                   @Autowired(required = false) TrackingViewPaqueteRepository trackingViewRepository) {
        this.paqueteService = paqueteService;
        this.guiaMasterService = guiaMasterService;
        this.trackingViewRepository = trackingViewRepository;
    }

    /**
     * NOTA: marcamos {@link ResourceNotFoundException} como
     * {@code noRollbackFor} porque dentro de este método se usa como
     * mecanismo legítimo de control de flujo (intentamos primero "pieza" y si
     * no existe seguimos con "guía master"). Sin esto, el primer fallo
     * marca la transacción como rollback-only y, aunque el {@code catch}
     * la silencie, el commit final estallaría con
     * {@code UnexpectedRollbackException} → 500 al cliente.
     */
    @Transactional(readOnly = true, noRollbackFor = ResourceNotFoundException.class)
    public TrackingResolveResponse resolve(String codigoRaw) {
        String codigo = codigoRaw != null ? codigoRaw.trim() : null;
        if (codigo == null || codigo.isEmpty()) {
            throw new BadRequestException("El codigo es obligatorio");
        }

        // 0. Hint rapido desde la proyeccion: si la fila existe sabemos que el codigo
        //    corresponde a una pieza y podemos saltar las pruebas de master/consolidado.
        boolean piezaHint = false;
        if (trackingViewRepository != null) {
            Optional<TrackingViewPaquete> view = trackingViewRepository.findByNumeroGuiaIgnoreCase(codigo);
            piezaHint = view.isPresent();
        }

        // 1. Pieza individual
        try {
            TrackingResponse pieza = paqueteService.findByNumeroGuiaForTracking(codigo);
            return TrackingResolveResponse.ofPieza(pieza);
        } catch (ResourceNotFoundException ignored) {
            // El hint nos dijo "es una pieza" pero el read model adelantado no la
            // tiene aun en transaccional (caso raro tras hard delete). Dejamos
            // continuar al fallback completo.
            if (piezaHint) {
                log.info("tracking_view_stale_hint codigo={}", codigo);
            }
        }

        // 2. Guia master por tracking_base
        Optional<TrackingMasterResponse> master = guiaMasterService.findByTrackingBaseForTracking(codigo);
        if (master.isPresent()) {
            return TrackingResolveResponse.ofMaster(master.get());
        }

        log.info("tracking_miss codigo={}", codigo);
        throw new ResourceNotFoundException("Tracking", codigo);
    }
}
