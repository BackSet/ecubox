package com.ecubox.ecubox_backend.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaqueteDTO {

    private Long id;
    private String numeroGuia;
    private String numeroGuiaEnvio;
    private String ref;
    private BigDecimal pesoLbs;
    private BigDecimal pesoKg;
    private String contenido;
    private Long estadoRastreoId;
    private String estadoRastreoNombre;
    private String estadoRastreoCodigo;
    private Long destinatarioFinalId;
    private String destinatarioNombre;
    private String destinatarioDireccion;
    private String destinatarioProvincia;
    private String destinatarioCanton;
    private String destinatarioTelefono;
    private Long sacaId;
    private Long despachoId;
    private String despachoNumeroGuia;
    private Boolean enFlujoAlterno;
    private String motivoAlterno;
    private Boolean bloqueado;
}
