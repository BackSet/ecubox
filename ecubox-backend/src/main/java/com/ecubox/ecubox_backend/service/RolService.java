package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.PermisoDTO;
import com.ecubox.ecubox_backend.dto.RolDTO;
import com.ecubox.ecubox_backend.dto.RolPermisosUpdateRequest;
import com.ecubox.ecubox_backend.entity.Permiso;
import com.ecubox.ecubox_backend.entity.Rol;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.PermisoRepository;
import com.ecubox.ecubox_backend.repository.RolRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Service
public class RolService {

    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;

    public RolService(RolRepository rolRepository, PermisoRepository permisoRepository) {
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
    }

    @Transactional(readOnly = true)
    public List<RolDTO> findAll() {
        return rolRepository.findAllWithPermisos().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public RolDTO findById(Long id) {
        Rol rol = rolRepository.findByIdWithPermisos(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", id));
        return toDTO(rol);
    }

    @Transactional
    public RolDTO updatePermisos(Long id, RolPermisosUpdateRequest request) {
        Rol rol = rolRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", id));
        List<Permiso> permisos = permisoRepository.findAllById(request.getPermisoIds());
        if (permisos.size() != request.getPermisoIds().size()) {
            throw new BadRequestException("Uno o más permisos no existen");
        }
        rol.setPermisos(new HashSet<>(permisos));
        rolRepository.save(rol);
        Rol updated = rolRepository.findByIdWithPermisos(id)
                .orElseThrow(() -> new ResourceNotFoundException("Rol", id));
        return toDTO(updated);
    }

    private RolDTO toDTO(Rol r) {
        List<PermisoDTO> permisos = r.getPermisos().stream()
                .map(p -> PermisoDTO.builder()
                        .id(p.getId())
                        .codigo(p.getCodigo())
                        .descripcion(p.getDescripcion())
                        .build())
                .toList();
        return RolDTO.builder()
                .id(r.getId())
                .nombre(r.getNombre())
                .permisos(permisos)
                .build();
    }
}
