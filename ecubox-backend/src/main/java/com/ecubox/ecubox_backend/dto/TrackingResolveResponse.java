package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TrackingTipo;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Envoltura polimorfica devuelta por el endpoint unificado
 * {@code GET /api/v1/tracking?codigo=...}.
 * Solo uno de los dos payloads esta poblado, segun {@link #tipo}.
 */
@Schema(description = "Respuesta unificada de tracking (pieza o guía master)")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingResolveResponse {
    @Schema(description = "Tipo de resultado resuelto")
    private TrackingTipo tipo;
    @Schema(description = "Datos cuando el código corresponde a una pieza")
    private TrackingResponse pieza;
    @Schema(description = "Datos cuando el código corresponde a una guía master")
    private TrackingMasterResponse master;

    public static TrackingResolveResponse ofPieza(TrackingResponse pieza) {
        return TrackingResolveResponse.builder()
                .tipo(TrackingTipo.PIEZA)
                .pieza(pieza)
                .build();
    }

    public static TrackingResolveResponse ofMaster(TrackingMasterResponse master) {
        return TrackingResolveResponse.builder()
                .tipo(TrackingTipo.GUIA_MASTER)
                .master(master)
                .build();
    }
}
