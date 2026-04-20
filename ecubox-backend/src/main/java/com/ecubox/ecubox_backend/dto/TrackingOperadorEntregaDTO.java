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

    private String courierEntregaNombre;
    private String courierEntregaCodigo;
    private String horarioRepartoCourierEntrega;
    private String paginaTrackingCourierEntrega;
    private Integer diasMaxRetiroDomicilio;

    private String agenciaNombre;
    private String agenciaCodigo;
    private String agenciaDireccion;
    private String agenciaProvincia;
    private String agenciaCanton;
    private String horarioAtencionAgencia;
    private Integer diasMaxRetiroAgencia;

    private String agenciaCourierEntregaEtiqueta;
    private String agenciaCourierEntregaCodigo;
    private String agenciaCourierEntregaDireccion;
    private String agenciaCourierEntregaProvincia;
    private String agenciaCourierEntregaCanton;
    private String horarioAtencionAgenciaCourierEntrega;
    private Integer diasMaxRetiroAgenciaCourierEntrega;
}

