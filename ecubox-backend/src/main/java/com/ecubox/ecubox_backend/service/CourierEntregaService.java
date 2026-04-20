package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.CourierEntregaDTO;
import com.ecubox.ecubox_backend.dto.CourierEntregaRequest;
import com.ecubox.ecubox_backend.entity.CourierEntrega;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.mapper.CourierEntregaMapper;
import com.ecubox.ecubox_backend.repository.CourierEntregaRepository;
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
public class CourierEntregaService {

    private final CourierEntregaRepository courierEntregaRepository;
    private final CourierEntregaMapper courierEntregaMapper;

    public CourierEntregaService(CourierEntregaRepository courierEntregaRepository, CourierEntregaMapper courierEntregaMapper) {
        this.courierEntregaRepository = courierEntregaRepository;
        this.courierEntregaMapper = courierEntregaMapper;
    }

    @Transactional(readOnly = true)
    public List<CourierEntregaDTO> findAll() {
        return courierEntregaRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Lista paginada con búsqueda libre (LIKE multi-token) sobre nombre,
     * código, email, horario de reparto y página de tracking. La entidad no
     * expone RUC ni teléfono.
     */
    @Transactional(readOnly = true)
    public Page<CourierEntregaDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.ASC, "nombre").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<CourierEntrega> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("nombre"),
                SearchSpecifications.field("codigo"),
                SearchSpecifications.field("email"),
                SearchSpecifications.field("horarioReparto"),
                SearchSpecifications.field("paginaTracking"));
        return courierEntregaRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public CourierEntregaDTO findById(Long id) {
        CourierEntrega d = courierEntregaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CourierEntrega", id));
        return toDTO(d);
    }

    @Transactional
    public CourierEntregaDTO create(CourierEntregaRequest request) {
        String codigo = request.getCodigo().trim();
        if (courierEntregaRepository.existsByCodigo(codigo)) {
            throw new BadRequestException("Ya existe un courierEntrega con el código " + codigo);
        }
        CourierEntrega entity = toEntity(request);
        entity = courierEntregaRepository.save(entity);
        return toDTO(entity);
    }

    @Transactional
    public CourierEntregaDTO update(Long id, CourierEntregaRequest request) {
        CourierEntrega entity = courierEntregaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("CourierEntrega", id));
        String codigo = request.getCodigo().trim();
        if (courierEntregaRepository.existsByCodigoAndIdNot(codigo, id)) {
            throw new BadRequestException("Ya existe otro courierEntrega con el código " + codigo);
        }
        updateEntityFromRequest(entity, request);
        entity = courierEntregaRepository.save(entity);
        return toDTO(entity);
    }

    @Transactional
    public void delete(Long id) {
        if (!courierEntregaRepository.existsById(id)) {
            throw new ResourceNotFoundException("CourierEntrega", id);
        }
        courierEntregaRepository.deleteById(id);
    }

    private CourierEntrega toEntity(CourierEntregaRequest r) {
        return CourierEntrega.builder()
                .nombre(r.getNombre().trim())
                .codigo(r.getCodigo().trim())
                .email(r.getEmail() != null ? r.getEmail().trim() : null)
                .tarifaEnvio(r.getTarifaEnvio() != null ? r.getTarifaEnvio() : java.math.BigDecimal.ZERO)
                .horarioReparto(r.getHorarioReparto() != null ? r.getHorarioReparto().trim() : null)
                .paginaTracking(r.getPaginaTracking() != null ? r.getPaginaTracking().trim() : null)
                .diasMaxRetiroDomicilio(r.getDiasMaxRetiroDomicilio())
                .build();
    }

    private void updateEntityFromRequest(CourierEntrega entity, CourierEntregaRequest r) {
        entity.setNombre(r.getNombre().trim());
        entity.setCodigo(r.getCodigo().trim());
        entity.setEmail(r.getEmail() != null ? r.getEmail().trim() : null);
        entity.setTarifaEnvio(r.getTarifaEnvio() != null ? r.getTarifaEnvio() : java.math.BigDecimal.ZERO);
        entity.setHorarioReparto(r.getHorarioReparto() != null ? r.getHorarioReparto().trim() : null);
        entity.setPaginaTracking(r.getPaginaTracking() != null ? r.getPaginaTracking().trim() : null);
        entity.setDiasMaxRetiroDomicilio(r.getDiasMaxRetiroDomicilio());
    }

    private CourierEntregaDTO toDTO(CourierEntrega d) {
        return courierEntregaMapper.toDTO(d);
    }
}
