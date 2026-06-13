package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.entity.TipoAccesoEnlace;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Vista de un enlace de acceso para el módulo de gestión (sin el token en claro).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccesoEnlaceDTO {
    private Long id;
    /** Identificador de negocio visible y estable (formato ACC-000001). */
    private String codigo;
    /** Token en claro para reconstruir y copiar la URL del enlace. */
    private String token;
    private TipoAccesoEnlace tipo;
    private String etiqueta;
    private LocalDateTime expiraAt;
    private LocalDateTime createdAt;
    private LocalDateTime ultimoAccesoAt;
    private boolean vigente;
    private List<ConsignatarioResumenDTO> consignatarios;
    private String creadoPor;
}
