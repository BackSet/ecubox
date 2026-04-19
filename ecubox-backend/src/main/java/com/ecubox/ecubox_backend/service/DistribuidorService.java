package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.DistribuidorDTO;
import com.ecubox.ecubox_backend.dto.DistribuidorRequest;
import com.ecubox.ecubox_backend.entity.Distribuidor;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.mapper.DistribuidorMapper;
import com.ecubox.ecubox_backend.repository.DistribuidorRepository;
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
public class DistribuidorService {

    private final DistribuidorRepository distribuidorRepository;
    private final DistribuidorMapper distribuidorMapper;

    public DistribuidorService(DistribuidorRepository distribuidorRepository, DistribuidorMapper distribuidorMapper) {
        this.distribuidorRepository = distribuidorRepository;
        this.distribuidorMapper = distribuidorMapper;
    }

    @Transactional(readOnly = true)
    public List<DistribuidorDTO> findAll() {
        return distribuidorRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Lista paginada con búsqueda libre (LIKE multi-token) sobre nombre,
     * código, email, horario de reparto y página de tracking. La entidad no
     * expone RUC ni teléfono.
     */
    @Transactional(readOnly = true)
    public Page<DistribuidorDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.ASC, "nombre").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Distribuidor> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("nombre"),
                SearchSpecifications.field("codigo"),
                SearchSpecifications.field("email"),
                SearchSpecifications.field("horarioReparto"),
                SearchSpecifications.field("paginaTracking"));
        return distribuidorRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public DistribuidorDTO findById(Long id) {
        Distribuidor d = distribuidorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Distribuidor", id));
        return toDTO(d);
    }

    @Transactional
    public DistribuidorDTO create(DistribuidorRequest request) {
        String codigo = request.getCodigo().trim();
        if (distribuidorRepository.existsByCodigo(codigo)) {
            throw new BadRequestException("Ya existe un distribuidor con el código " + codigo);
        }
        Distribuidor entity = toEntity(request);
        entity = distribuidorRepository.save(entity);
        return toDTO(entity);
    }

    @Transactional
    public DistribuidorDTO update(Long id, DistribuidorRequest request) {
        Distribuidor entity = distribuidorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Distribuidor", id));
        String codigo = request.getCodigo().trim();
        if (distribuidorRepository.existsByCodigoAndIdNot(codigo, id)) {
            throw new BadRequestException("Ya existe otro distribuidor con el código " + codigo);
        }
        updateEntityFromRequest(entity, request);
        entity = distribuidorRepository.save(entity);
        return toDTO(entity);
    }

    @Transactional
    public void delete(Long id) {
        if (!distribuidorRepository.existsById(id)) {
            throw new ResourceNotFoundException("Distribuidor", id);
        }
        distribuidorRepository.deleteById(id);
    }

    private Distribuidor toEntity(DistribuidorRequest r) {
        return Distribuidor.builder()
                .nombre(r.getNombre().trim())
                .codigo(r.getCodigo().trim())
                .email(r.getEmail() != null ? r.getEmail().trim() : null)
                .tarifaEnvio(r.getTarifaEnvio() != null ? r.getTarifaEnvio() : java.math.BigDecimal.ZERO)
                .horarioReparto(r.getHorarioReparto() != null ? r.getHorarioReparto().trim() : null)
                .paginaTracking(r.getPaginaTracking() != null ? r.getPaginaTracking().trim() : null)
                .diasMaxRetiroDomicilio(r.getDiasMaxRetiroDomicilio())
                .build();
    }

    private void updateEntityFromRequest(Distribuidor entity, DistribuidorRequest r) {
        entity.setNombre(r.getNombre().trim());
        entity.setCodigo(r.getCodigo().trim());
        entity.setEmail(r.getEmail() != null ? r.getEmail().trim() : null);
        entity.setTarifaEnvio(r.getTarifaEnvio() != null ? r.getTarifaEnvio() : java.math.BigDecimal.ZERO);
        entity.setHorarioReparto(r.getHorarioReparto() != null ? r.getHorarioReparto().trim() : null);
        entity.setPaginaTracking(r.getPaginaTracking() != null ? r.getPaginaTracking().trim() : null);
        entity.setDiasMaxRetiroDomicilio(r.getDiasMaxRetiroDomicilio());
    }

    private DistribuidorDTO toDTO(Distribuidor d) {
        return distribuidorMapper.toDTO(d);
    }
}
