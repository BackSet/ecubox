package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoEntrega;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DespachoDTO {

    private Long id;
    private String numeroGuia;
    private String observaciones;
    private String codigoPrecinto;
    private Long operarioId;
    private String operarioNombre;
    private LocalDateTime fechaHora;
    private Long distribuidorId;
    private String distribuidorNombre;
    private TipoEntrega tipoEntrega;
    private Long destinatarioFinalId;
    private String destinatarioNombre;
    private String destinatarioDireccion;
    private String destinatarioTelefono;
    private Long agenciaId;
    private String agenciaNombre;
    private Long agenciaDistribuidorId;
    private String agenciaDistribuidorNombre;
    private List<Long> sacaIds;
    /** Sacas con paquetes (solo poblado en GET por id). */
    private List<SacaDTO> sacas;
}
