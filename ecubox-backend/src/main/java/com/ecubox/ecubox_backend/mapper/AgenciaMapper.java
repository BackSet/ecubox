package com.ecubox.ecubox_backend.mapper;

import com.ecubox.ecubox_backend.dto.AgenciaDTO;
import com.ecubox.ecubox_backend.entity.Agencia;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface AgenciaMapper {
    AgenciaDTO toDTO(Agencia a);
}
