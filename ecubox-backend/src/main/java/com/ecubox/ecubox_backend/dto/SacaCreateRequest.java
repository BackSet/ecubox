package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TamanioSaca;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SacaCreateRequest {

    @NotBlank(message = "El número de orden es obligatorio")
    private String numeroOrden;

    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;
    private TamanioSaca tamanio;
}
