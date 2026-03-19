package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingOperadorEntregaDTO {
    private String tipoEntrega;

    private String distribuidorNombre;
    private String distribuidorCodigo;
    private String horarioRepartoDistribuidor;
    private String paginaTrackingDistribuidor;
    private Integer diasMaxRetiroDomicilio;

    private String agenciaNombre;
    private String agenciaCodigo;
    private String agenciaDireccion;
    private String agenciaProvincia;
    private String agenciaCanton;
    private String horarioAtencionAgencia;
    private Integer diasMaxRetiroAgencia;

    private String agenciaDistribuidorEtiqueta;
    private String agenciaDistribuidorCodigo;
    private String agenciaDistribuidorDireccion;
    private String agenciaDistribuidorProvincia;
    private String agenciaDistribuidorCanton;
    private String horarioAtencionAgenciaDistribuidor;
    private Integer diasMaxRetiroAgenciaDistribuidor;
}

