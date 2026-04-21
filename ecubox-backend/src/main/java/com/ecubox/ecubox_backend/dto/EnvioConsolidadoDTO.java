package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
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
    /** true si fechaCerrado != null. Derivado en el servidor para conveniencia del cliente. */
    private boolean cerrado;
    private LocalDateTime fechaCerrado;
    private BigDecimal pesoTotalLbs;
    private Integer totalPaquetes;
    /** Estado de pago de la liquidacion (sincronizado por el service de liquidacion). */
    private EstadoPagoConsolidado estadoPago;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<PaqueteDTO> paquetes;
}
