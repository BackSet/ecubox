package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.TipoEntrega;
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

    /**
     * Número de guía del courier. Obligatorio salvo en retiro presencial en
     * agencia (AGENCIA), donde el backend autogenera un código interno.
     */
    private String numeroGuia;

    /** Courier de entrega. Obligatorio salvo en retiro presencial en agencia. */
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

    /**
     * El courier de entrega y el número de guía son obligatorios para entregas
     * que viajan (DOMICILIO y AGENCIA_COURIER_ENTREGA).
     *
     * Para entrega en agencia (AGENCIA) hay dos modalidades:
     *   - Retiro en oficina: sin courier; la guía se autogenera (RET-AG-xxxxx).
     *   - Envío por courier: si se indica courier, el número de guía es obligatorio.
     */
    @jakarta.validation.constraints.AssertTrue(
            message = "El courier de entrega y el número de guía son obligatorios para este tipo de entrega")
    public boolean isCourierYGuiaCoherentes() {
        if (tipoEntrega == null) {
            return true;
        }
        boolean tieneCourier = courierEntregaId != null;
        boolean tieneGuia = numeroGuia != null && !numeroGuia.isBlank();
        if (tipoEntrega == TipoEntrega.AGENCIA) {
            // Retiro en oficina (sin courier) válido; si hay courier, exige guía.
            return !tieneCourier || tieneGuia;
        }
        return tieneCourier && tieneGuia;
    }
}
