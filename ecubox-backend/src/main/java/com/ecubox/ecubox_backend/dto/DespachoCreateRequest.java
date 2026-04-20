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

    @NotNull(message = "El courierEntrega es obligatorio")
    private Long courierEntregaId;

    @NotNull(message = "El tipo de entrega es obligatorio")
    private TipoEntrega tipoEntrega;

    private Long consignatarioId;
    private Long agenciaId;
    private Long agenciaCourierEntregaId;
    private String observaciones;
    private String codigoPrecinto;
    private LocalDateTime fechaHora;
    private List<Long> sacaIds;

    /**
     * Si DOMICILIO: consignatarioId obligatorio; agenciaId y agenciaCourierEntregaId nulos.
     * Si AGENCIA: agenciaId obligatorio; consignatarioId y agenciaCourierEntregaId nulos.
     * Si AGENCIA_COURIER_ENTREGA: agenciaCourierEntregaId obligatorio; consignatarioId y agenciaId nulos.
     */
    @jakarta.validation.constraints.AssertTrue(message = "Domicilio requiere destinatario; Agencia requiere agencia; Agencia de courierEntrega requiere agencia del courierEntrega")
    public boolean isValidTipoEntrega() {
        if (tipoEntrega == null) return true;
        if (tipoEntrega == TipoEntrega.DOMICILIO) {
            return consignatarioId != null && agenciaId == null && agenciaCourierEntregaId == null;
        }
        if (tipoEntrega == TipoEntrega.AGENCIA) {
            return agenciaId != null && consignatarioId == null && agenciaCourierEntregaId == null;
        }
        if (tipoEntrega == TipoEntrega.AGENCIA_COURIER_ENTREGA) {
            return agenciaCourierEntregaId != null && consignatarioId == null && agenciaId == null;
        }
        return true;
    }
}
