package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.PermisoDTO;
import com.ecubox.ecubox_backend.entity.Permiso;
import com.ecubox.ecubox_backend.mapper.PermisoMapper;
import com.ecubox.ecubox_backend.repository.PermisoRepository;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
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

    /**
     * Lista paginada con búsqueda libre (LIKE multi-token) sobre {@code codigo}
     * y {@code descripcion}. La entidad {@code Permiso} no expone {@code nombre}
     * ni {@code modulo} como columnas separadas (el módulo se infiere del prefijo
     * del código en el frontend).
     */
    @Transactional(readOnly = true)
    public Page<PermisoDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.ASC, "codigo").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Permiso> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("codigo"),
                SearchSpecifications.field("descripcion"));
        return permisoRepository.findAll(spec, pageable).map(permisoMapper::toDTO);
    }
}
