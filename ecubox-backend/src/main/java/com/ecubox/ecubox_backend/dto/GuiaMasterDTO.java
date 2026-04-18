package com.ecubox.ecubox_backend.dto;

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
public class GuiaMasterDTO {

    private Long id;
    private String trackingBase;
    private Integer totalPiezasEsperadas;
    private Long destinatarioFinalId;
    private String destinatarioNombre;
    private String destinatarioTelefono;
    private String destinatarioDireccion;
    private String destinatarioProvincia;
    private String destinatarioCanton;
    private Long clienteUsuarioId;
    private String clienteUsuarioNombre;
    private Integer piezasRegistradas;
    private Integer piezasRecibidas;
    private Integer piezasDespachadas;
    private String estadoGlobal;
    private LocalDateTime createdAt;
    private LocalDateTime fechaPrimeraRecepcion;
    private LocalDateTime fechaPrimeraPiezaDespachada;
    private Integer minPiezasParaDespachoParcial;
    private Boolean listaParaDespachoParcial;
    private Boolean despachoParcialEnCurso;
    private List<PaqueteDTO> piezas;
}
