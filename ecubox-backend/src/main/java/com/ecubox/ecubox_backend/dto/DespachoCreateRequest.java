package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoEntrega;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class DespachoCreateRequest {

    @NotBlank(message = "El número de guía es obligatorio")
    private String numeroGuia;

    @NotNull(message = "El distribuidor es obligatorio")
    private Long distribuidorId;

    @NotNull(message = "El tipo de entrega es obligatorio")
    private TipoEntrega tipoEntrega;

    private Long destinatarioFinalId;
    private Long agenciaId;
    private Long agenciaDistribuidorId;
    private String observaciones;
    private String codigoPrecinto;
    private LocalDateTime fechaHora;
    private List<Long> sacaIds;

    /**
     * Si DOMICILIO: destinatarioFinalId obligatorio; agenciaId y agenciaDistribuidorId nulos.
     * Si AGENCIA: agenciaId obligatorio; destinatarioFinalId y agenciaDistribuidorId nulos.
     * Si AGENCIA_DISTRIBUIDOR: agenciaDistribuidorId obligatorio; destinatarioFinalId y agenciaId nulos.
     */
    @jakarta.validation.constraints.AssertTrue(message = "Domicilio requiere destinatario; Agencia requiere agencia; Agencia de distribuidor requiere agencia del distribuidor")
    public boolean isValidTipoEntrega() {
        if (tipoEntrega == null) return true;
        if (tipoEntrega == TipoEntrega.DOMICILIO) {
            return destinatarioFinalId != null && agenciaId == null && agenciaDistribuidorId == null;
        }
        if (tipoEntrega == TipoEntrega.AGENCIA) {
            return agenciaId != null && destinatarioFinalId == null && agenciaDistribuidorId == null;
        }
        if (tipoEntrega == TipoEntrega.AGENCIA_DISTRIBUIDOR) {
            return agenciaDistribuidorId != null && destinatarioFinalId == null && agenciaId == null;
        }
        return true;
    }
}
