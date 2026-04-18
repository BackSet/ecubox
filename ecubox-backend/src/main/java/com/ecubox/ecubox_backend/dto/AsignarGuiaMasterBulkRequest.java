package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AsignarGuiaMasterBulkRequest {

    @NotNull(message = "La guía master es obligatoria")
    private Long guiaMasterId;

    @NotEmpty(message = "Debe indicar al menos un paquete")
    private List<Long> paqueteIds;
}
