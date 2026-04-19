package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.AgenciaDTO;
import com.ecubox.ecubox_backend.dto.AgenciaRequest;
import com.ecubox.ecubox_backend.entity.Agencia;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.mapper.AgenciaMapper;
import com.ecubox.ecubox_backend.repository.AgenciaRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
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
public class AgenciaService {

    private final AgenciaRepository agenciaRepository;
    private final AgenciaMapper agenciaMapper;
    private final AgenciaVersionService agenciaVersionService;
    private final CurrentUserService currentUserService;

    public AgenciaService(AgenciaRepository agenciaRepository,
                          AgenciaMapper agenciaMapper,
                          AgenciaVersionService agenciaVersionService,
                          CurrentUserService currentUserService) {
        this.agenciaRepository = agenciaRepository;
        this.agenciaMapper = agenciaMapper;
        this.agenciaVersionService = agenciaVersionService;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<AgenciaDTO> findAll() {
        return agenciaRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Lista paginada con búsqueda libre (LIKE multi-token) sobre nombre,
     * código, encargado, cantón, provincia, dirección y horario de atención.
     */
    @Transactional(readOnly = true)
    public Page<AgenciaDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.ASC, "nombre").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<Agencia> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("nombre"),
                SearchSpecifications.field("codigo"),
                SearchSpecifications.field("encargado"),
                SearchSpecifications.field("canton"),
                SearchSpecifications.field("provincia"),
                SearchSpecifications.field("direccion"),
                SearchSpecifications.field("horarioAtencion"));
        return agenciaRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public AgenciaDTO findById(Long id) {
        Agencia a = agenciaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agencia", id));
        return toDTO(a);
    }

    @Transactional
    public AgenciaDTO create(AgenciaRequest request) {
        String codigo = request.getCodigo().trim();
        if (agenciaRepository.existsByCodigo(codigo)) {
            throw new BadRequestException("Ya existe una agencia con el código " + codigo);
        }
        Agencia entity = toEntity(request);
        entity = agenciaRepository.save(entity);
        agenciaVersionService.crearNuevaVersion(entity, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(entity);
    }

    @Transactional
    public AgenciaDTO update(Long id, AgenciaRequest request) {
        Agencia entity = agenciaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agencia", id));
        String codigo = request.getCodigo().trim();
        if (agenciaRepository.existsByCodigoAndIdNot(codigo, id)) {
            throw new BadRequestException("Ya existe otra agencia con el código " + codigo);
        }
        updateEntityFromRequest(entity, request);
        entity = agenciaRepository.save(entity);
        agenciaVersionService.crearNuevaVersion(entity, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(entity);
    }

    @Transactional
    public void delete(Long id) {
        if (!agenciaRepository.existsById(id)) {
            throw new ResourceNotFoundException("Agencia", id);
        }
        agenciaRepository.deleteById(id);
    }

    private Agencia toEntity(AgenciaRequest r) {
        return Agencia.builder()
                .nombre(r.getNombre().trim())
                .encargado(r.getEncargado() != null ? r.getEncargado().trim() : null)
                .codigo(r.getCodigo().trim())
                .direccion(r.getDireccion() != null ? r.getDireccion().trim() : null)
                .provincia(r.getProvincia() != null ? r.getProvincia().trim() : null)
                .canton(r.getCanton() != null ? r.getCanton().trim() : null)
                .horarioAtencion(r.getHorarioAtencion() != null ? r.getHorarioAtencion().trim() : null)
                .diasMaxRetiro(r.getDiasMaxRetiro())
                .tarifaServicio(r.getTarifaServicio() != null ? r.getTarifaServicio() : java.math.BigDecimal.ZERO)
                .build();
    }

    private void updateEntityFromRequest(Agencia entity, AgenciaRequest r) {
        entity.setNombre(r.getNombre().trim());
        entity.setEncargado(r.getEncargado() != null ? r.getEncargado().trim() : null);
        entity.setCodigo(r.getCodigo().trim());
        entity.setDireccion(r.getDireccion() != null ? r.getDireccion().trim() : null);
        entity.setProvincia(r.getProvincia() != null ? r.getProvincia().trim() : null);
        entity.setCanton(r.getCanton() != null ? r.getCanton().trim() : null);
        entity.setHorarioAtencion(r.getHorarioAtencion() != null ? r.getHorarioAtencion().trim() : null);
        entity.setDiasMaxRetiro(r.getDiasMaxRetiro());
        entity.setTarifaServicio(r.getTarifaServicio() != null ? r.getTarifaServicio() : java.math.BigDecimal.ZERO);
    }

    private AgenciaDTO toDTO(Agencia a) {
        return agenciaMapper.toDTO(a);
    }
}
