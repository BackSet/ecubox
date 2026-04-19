package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.RolDTO;
import com.ecubox.ecubox_backend.dto.RolPermisosUpdateRequest;
import com.ecubox.ecubox_backend.entity.Permiso;
import com.ecubox.ecubox_backend.entity.Rol;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.mapper.RolMapper;
import com.ecubox.ecubox_backend.repository.PermisoRepository;
import com.ecubox.ecubox_backend.repository.RolRepository;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;

@Service
public class RolService {

    private final RolRepository rolRepository;
    private final PermisoRepository permisoRepository;
    private final RolMapper rolMapper;

    public RolService(RolRepository rolRepository, PermisoRepository permisoRepository, RolMapper rolMapper) {
        this.rolRepository = rolRepository;
        this.permisoRepository = permisoRepository;
        this.rolMapper = rolMapper;
    }

    @Transactional(readOnly = true)
    public List<RolDTO> findAll() {
        return rolRepository.findAllWithPermisos().stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Lista paginada con búsqueda libre (LIKE multi-token) sobre el nombre del
     * rol y, vía LEFT JOIN a la colección {@code permisos}, también sobre el
     * código y la descripción de cualquiera de sus permisos. Se usa
     * {@link SearchSpecifications#tokensLikeDistinct tokensLikeDistinct} para
     * que el JOIN a la colección no genere filas duplicadas en el resultado
     * paginado cuando varios permisos del mismo rol matcheen el token.
     */
    @Transactional(readOnly = true)
    public Page<RolDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.ASC, "nombre").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Rol> spec = SearchSpecifications.tokensLikeDistinct(q,
                SearchSpecifications.field("nombre"),
                SearchSpecifications.path("permisos", "codigo"),
                SearchSpecifications.path("permisos", "descripcion"));
        return rolRepository.findAll(spec, pageable).map(this::toDTO);
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
        return rolMapper.toDTO(r);
    }
}
