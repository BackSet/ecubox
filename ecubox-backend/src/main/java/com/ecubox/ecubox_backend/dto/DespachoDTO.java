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
    private Long courierEntregaId;
    private String courierEntregaNombre;
    private TipoEntrega tipoEntrega;
    private Long consignatarioId;
    private String consignatarioNombre;
    private String consignatarioDireccion;
    private String consignatarioTelefono;
    private Long agenciaId;
    private String agenciaNombre;
    private Long agenciaCourierEntregaId;
    private String agenciaCourierEntregaNombre;
    private List<Long> sacaIds;
    /** Sacas con paquetes (solo poblado en GET por id). */
    private List<SacaDTO> sacas;

    /** SCD2: id de la version inmutable del destinatario congelada en el despacho. */
    private Long consignatarioVersionId;
    /** SCD2: id de la version inmutable de la agencia congelada en el despacho. */
    private Long agenciaVersionId;
    /** SCD2: id de la version inmutable de la agencia de courierEntrega congelada en el despacho. */
    private Long agenciaCourierEntregaVersionId;
    /** Cuando el despacho fijo el snapshot del destino. */
    private LocalDateTime destinoCongeladoEn;
}
