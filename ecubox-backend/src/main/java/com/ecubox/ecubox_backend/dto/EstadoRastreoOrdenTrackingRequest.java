package com.ecubox.ecubox_backend.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EstadoRastreoOrdenTrackingRequest {

    @NotEmpty(message = "Debe enviar la lista de IDs de estados base")
    private List<@NotNull(message = "Los IDs de estado no pueden ser nulos") Long> estadoIds;

    @Builder.Default
    private List<@Valid EstadoRastreoAlternoAfterItemRequest> alternosAfter = List.of();
}
