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
    private Long consignatarioId;
    private String consignatarioNombre;
    private String consignatarioTelefono;
    private String consignatarioDireccion;
    private String consignatarioProvincia;
    private String consignatarioCanton;
    /**
     * TRUE cuando los datos del destinatario no provienen del propio
     * {@code GuiaMaster.consignatario} sino de un fallback (primera pieza
     * con destinatario asignado). Permite a la UI advertir que el dato es
     * inferido en lugar de mostrar "Sin asignar".
     */
    private Boolean consignatarioInferido;
    /** Snapshot SCD2: id de la version del destinatario congelada en la guia. NULL si todavia no hay congelado. */
    private Long consignatarioVersionId;
    /** Cuando se congelaron los datos del destinatario (primer despacho). */
    private LocalDateTime consignatarioCongeladoEn;
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

    // Auditoria de cierre (V66)
    private LocalDateTime cerradaEn;
    private Long cerradaPorUsuarioId;
    private String cerradaPorUsuarioNombre;
    /** DESPACHO_COMPLETADO | DESPACHO_INCOMPLETO_MANUAL | DESPACHO_INCOMPLETO_TIMEOUT | CANCELACION */
    private String tipoCierre;
    private String motivoCierre;

    private List<PaqueteDTO> piezas;
}
