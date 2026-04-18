package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.PermisoDTO;
import com.ecubox.ecubox_backend.mapper.PermisoMapper;
import com.ecubox.ecubox_backend.repository.PermisoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class PermisoService {

    private final PermisoRepository permisoRepository;
    private final PermisoMapper permisoMapper;

    public PermisoService(PermisoRepository permisoRepository, PermisoMapper permisoMapper) {
        this.permisoRepository = permisoRepository;
        this.permisoMapper = permisoMapper;
    }

    @Transactional(readOnly = true)
    public List<PermisoDTO> findAll() {
        return permisoRepository.findAll().stream()
                .map(permisoMapper::toDTO)
                .toList();
    }
}
