package com.ecubox.ecubox_backend.mapper;

import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Mapper MapStruct para {@link EstadoRastreo} <-> {@link EstadoRastreoDTO}.
 *
 * <p>Reemplaza el mapeo manual previo {@code EstadoRastreoService.toDTO}. La
 * relacion {@code afterEstado} se aplana al id en el DTO; el sentido inverso
 * (resolver el id contra la base) sigue manejandose en el servicio porque
 * requiere consultas y validaciones de negocio.
 */
@Mapper(componentModel = "spring")
public interface EstadoRastreoMapper {

    @Mapping(target = "afterEstadoId", source = "afterEstado.id")
    EstadoRastreoDTO toDTO(EstadoRastreo entity);
}
