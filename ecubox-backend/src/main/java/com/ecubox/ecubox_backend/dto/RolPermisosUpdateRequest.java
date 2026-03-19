package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolPermisosUpdateRequest {

    @NotNull(message = "La lista de permisos es obligatoria")
    private List<Long> permisoIds;
}
