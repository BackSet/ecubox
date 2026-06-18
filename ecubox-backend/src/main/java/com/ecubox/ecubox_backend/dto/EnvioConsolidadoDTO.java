package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EnvioConsolidadoDTO {

    private Long id;
    private String codigo;
    /** true si el consolidado ya no admite cambios de paquetes. */
    private boolean cerrado;
    /** Estado operativo persistido del consolidado. */
    private EstadoEnvioConsolidadoOperativo estadoOperativo;
    /** Fecha de cierre para registro (estado CERRADO). */
    private LocalDateTime fechaCierre;
    /** Fecha de salida desde USA (estado ENVIADO_DESDE_USA). */
    private LocalDateTime fechaCerrado;
    /** Fecha de arribo a Ecuador (estado ARRIBADO_ECUADOR). */
    private LocalDateTime fechaArriboEcuador;
    private BigDecimal pesoTotalLbs;
    private Integer totalPaquetes;
    /** Estado de pago de la liquidación (sincronizado por el service de liquidación). */
    private EstadoPagoConsolidado estadoPago;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PaqueteDTO> paquetes;
    /**
     * Resumen agregado de los estados de rastreo de los paquetes. Solo se
     * completa en el listado paginado (calculado por lote, sin N+1); es
     * {@code null} en el resto de respuestas.
     */
    private ResumenEstadosPaquetesConsolidadoDTO resumenEstadosPaquetes;
}
