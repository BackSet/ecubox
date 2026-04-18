package com.ecubox.ecubox_backend.mapper;

import com.ecubox.ecubox_backend.dto.PermisoDTO;
import com.ecubox.ecubox_backend.entity.Permiso;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface PermisoMapper {
    PermisoDTO toDTO(Permiso p);
}
