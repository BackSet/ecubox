package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TamanioSaca;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SacaDTO {

    private Long id;
    private String numeroOrden;
    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;
    private TamanioSaca tamanio;
    private Long despachoId;
    /** Paquetes de la saca en orden de creación. */
    private List<PaqueteDTO> paquetes;
    /** Peso total calculado como suma de los pesos de los paquetes. */
    private BigDecimal pesoTotalLbs;
    private BigDecimal pesoTotalKg;
}
