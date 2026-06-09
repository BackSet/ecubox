package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaqueteDTO {

    private Long id;
    private String numeroGuia;
    private Long guiaMasterId;
    private String guiaMasterTrackingBase;
    private String guiaMasterEstadoGlobal;
    private Integer guiaMasterTotalPiezas;
    private Integer piezaNumero;
    private Integer piezaTotal;
    private Long envioConsolidadoId;
    private String envioConsolidadoCodigo;
    /** true si el envio consolidado al que pertenece el paquete ya fue enviado desde USA. */
    private boolean envioConsolidadoCerrado;
    /** Estado operativo derivado del envío consolidado; null si el paquete no tiene consolidado. */
    private EstadoEnvioConsolidadoOperativo envioConsolidadoEstadoOperativo;
    private String ref;
    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;
    private String contenido;
    private Long estadoRastreoId;
    private String estadoRastreoNombre;
    private String estadoRastreoCodigo;
    /** Tipo de flujo del estado (NORMAL/ALTERNO); permite derivar el color sin quemar códigos. */
    private String estadoRastreoTipoFlujo;
    /** Orden del estado de rastreo actual; permite filtrar elegibilidad sin quemar códigos. */
    private Integer estadoRastreoOrden;
    private Long consignatarioId;
    private String consignatarioNombre;
    private String consignatarioDireccion;
    private String consignatarioProvincia;
    private String consignatarioCanton;
    private String consignatarioTelefono;
    private Long sacaId;
    private Long despachoId;
    private String despachoNumeroGuia;
    private LocalDateTime fechaEstadoDesde;
    private Integer diasMaxRetiro;
    private Integer diasTranscurridos;
    private Integer diasRestantes;
    private Integer diasAtrasoRetiro;
    private Boolean paqueteVencido;
    private Boolean enFlujoAlterno;
    private String motivoAlterno;
    private Boolean bloqueado;
    private LocalDateTime createdAt;
}
