package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GuiaMasterEstadoHistorialDTO {

    private Long id;
    private Long guiaMasterId;
    /** Puede ser null para el evento de creacion. */
    private String estadoAnterior;
    private String estadoNuevo;
    /**
     * CREACION | RECALCULO_AUTOMATICO | CIERRE_MANUAL_FALTANTE |
     * AUTO_CIERRE_TIMEOUT | CANCELACION | MARCAR_REVISION |
     * SALIR_REVISION | REAPERTURA.
     */
    private String tipoCambio;
    private String motivo;
    private Long cambiadoPorUsuarioId;
    private String cambiadoPorUsuarioNombre;
    private LocalDateTime cambiadoEn;
}
