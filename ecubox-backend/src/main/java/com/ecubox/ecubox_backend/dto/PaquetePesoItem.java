package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaquetePesoItem {

    @NotNull(message = "El ID del paquete es obligatorio")
    private Long paqueteId;

    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;

    @AssertTrue(message = "Debe indicar al menos un peso (lbs o kg) positivo")
    public boolean isValidWeight() {
        if (pesoLbs != null && pesoLbs.compareTo(BigDecimal.ZERO) > 0) {
            return true;
        }
        return pesoKg != null && pesoKg.compareTo(BigDecimal.ZERO) > 0;
    }
}
