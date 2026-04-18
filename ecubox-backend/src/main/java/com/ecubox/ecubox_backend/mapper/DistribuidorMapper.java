package com.ecubox.ecubox_backend.mapper;

import com.ecubox.ecubox_backend.dto.DistribuidorDTO;
import com.ecubox.ecubox_backend.entity.Distribuidor;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface DistribuidorMapper {
    DistribuidorDTO toDTO(Distribuidor d);
}
