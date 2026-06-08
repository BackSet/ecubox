package com.ecubox.ecubox_backend.dto;

import com.ecubox.ecubox_backend.entity.TipoAccesoEnlace;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Solicitud para generar un enlace de acceso acotado a un conjunto de
 * consignatarios. Para {@code TEMPORAL} es obligatorio {@code duracionHoras}
 * (el frontend convierte días a horas); para {@code PERSISTENTE} se ignora.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class GenerarAccesoEnlaceRequest {

    @NotNull(message = "El tipo de enlace es obligatorio")
    private TipoAccesoEnlace tipo;

    @NotEmpty(message = "Debe seleccionar al menos un consignatario")
    private List<Long> consignatarioIds;

    @Positive(message = "La duración en horas debe ser mayor que cero")
    private Integer duracionHoras;

    @Size(max = 120, message = "La etiqueta no puede superar 120 caracteres")
    private String etiqueta;
}
