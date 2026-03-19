package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.PermisoDTO;
import com.ecubox.ecubox_backend.entity.Permiso;
import com.ecubox.ecubox_backend.repository.PermisoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PermisoService {

    private final PermisoRepository permisoRepository;

    public PermisoService(PermisoRepository permisoRepository) {
        this.permisoRepository = permisoRepository;
    }

    @Transactional(readOnly = true)
    public List<PermisoDTO> findAll() {
        return permisoRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    private PermisoDTO toDTO(Permiso p) {
        return PermisoDTO.builder()
                .id(p.getId())
                .codigo(p.getCodigo())
                .descripcion(p.getDescripcion())
                .build();
    }
}
