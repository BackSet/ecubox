package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SacasElegiblesDespachoDTO {
    private Long estadoRequeridoId;
    private String estadoRequeridoNombre;
    private List<SacaDTO> sacas;
}
