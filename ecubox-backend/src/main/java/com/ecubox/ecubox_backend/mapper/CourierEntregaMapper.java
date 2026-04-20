package com.ecubox.ecubox_backend.mapper;

import com.ecubox.ecubox_backend.dto.CourierEntregaDTO;
import com.ecubox.ecubox_backend.entity.CourierEntrega;
import org.mapstruct.Mapper;

@Mapper(componentModel = "spring")
public interface CourierEntregaMapper {
    CourierEntregaDTO toDTO(CourierEntrega d);
}
