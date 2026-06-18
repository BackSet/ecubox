package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

import java.util.EnumSet;
import java.util.Set;

/**
 * Resuelve el estado operativo de un envío consolidado y expone especificaciones
 * JPA para filtrar listados por ese estado.
 *
 * <p>El estado se persiste en {@code envio_consolidado.estado_operativo}. Este
 * resolver es el punto único de acceso tanto para lectura como para filtrado,
 * de forma que el frontend y los endpoints de listado usen exactamente la misma
 * lógica.</p>
 */
@Component
public class EstadoConsolidadoOperativoResolver {

    /** Estados que bloquean la adición/eliminación de paquetes. */
    private static final Set<EstadoEnvioConsolidadoOperativo> ESTADOS_CERRADOS = EnumSet.of(
            EstadoEnvioConsolidadoOperativo.CERRADO,
            EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA,
            EstadoEnvioConsolidadoOperativo.ARRIBADO_ECUADOR,
            EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA,
            EstadoEnvioConsolidadoOperativo.LIQUIDADO);

    /**
     * Devuelve el estado operativo persistido. Si por alguna razón es null
     * (registros previos a la migración), deriva desde campos legacy.
     */
    public EstadoEnvioConsolidadoOperativo resolve(EnvioConsolidado envio, long totalPaquetes) {
        if (envio == null) return EstadoEnvioConsolidadoOperativo.VACIO;
        if (envio.getEstadoOperativo() != null) {
            return envio.getEstadoOperativo();
        }
        // Fallback para registros sin estado_operativo (pre-migración).
        if (envio.getEstadoPago() == EstadoPagoConsolidado.PAGADO) {
            return EstadoEnvioConsolidadoOperativo.LIQUIDADO;
        }
        if (envio.getFechaCerrado() != null) {
            return EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA;
        }
        if (totalPaquetes <= 0) {
            return EstadoEnvioConsolidadoOperativo.VACIO;
        }
        return EstadoEnvioConsolidadoOperativo.EN_PREPARACION;
    }

    /**
     * Calcula el estado operativo del consolidado (método del motor canónico).
     */
    public EstadoEnvioConsolidadoOperativo calcularEstadoOperativoConsolidado(EnvioConsolidado envio, long totalPaquetes) {
        return resolve(envio, totalPaquetes);
    }

    public Specification<EnvioConsolidado> specificationFor(EstadoEnvioConsolidadoOperativo estado) {
        return (root, query, cb) ->
                cb.equal(root.get("estadoOperativo"), estado);
    }
}
