package com.ecubox.ecubox_backend.mapper;

import com.ecubox.ecubox_backend.dto.RolDTO;
import com.ecubox.ecubox_backend.entity.Rol;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring", uses = PermisoMapper.class)
public interface RolMapper {
    RolDTO toDTO(Rol r);
}
