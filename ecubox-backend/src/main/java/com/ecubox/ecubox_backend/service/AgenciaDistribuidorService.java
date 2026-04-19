package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.AgenciaDistribuidorDTO;
import com.ecubox.ecubox_backend.dto.AgenciaDistribuidorRequest;
import com.ecubox.ecubox_backend.entity.AgenciaDistribuidor;
import com.ecubox.ecubox_backend.entity.Distribuidor;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.AgenciaDistribuidorRepository;
import com.ecubox.ecubox_backend.repository.DistribuidorRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
public class AgenciaDistribuidorService {

    private final AgenciaDistribuidorRepository agenciaDistribuidorRepository;
    private final DistribuidorRepository distribuidorRepository;
    private final AgenciaDistribuidorVersionService versionService;
    private final CurrentUserService currentUserService;

    public AgenciaDistribuidorService(AgenciaDistribuidorRepository agenciaDistribuidorRepository,
                                      DistribuidorRepository distribuidorRepository,
                                      AgenciaDistribuidorVersionService versionService,
                                      CurrentUserService currentUserService) {
        this.agenciaDistribuidorRepository = agenciaDistribuidorRepository;
        this.distribuidorRepository = distribuidorRepository;
        this.versionService = versionService;
        this.currentUserService = currentUserService;
    }

    @Transactional(readOnly = true)
    public List<AgenciaDistribuidorDTO> findAll() {
        return agenciaDistribuidorRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Lista paginada con búsqueda libre (LIKE multi-token) sobre código,
     * nombre del distribuidor relacionado, provincia, cantón, dirección y
     * horario de atención. La entidad no tiene campo {@code nombre}; el
     * código identifica la agencia.
     */
    @Transactional(readOnly = true)
    public Page<AgenciaDistribuidorDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.ASC, "codigo").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<AgenciaDistribuidor> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("codigo"),
                SearchSpecifications.path("distribuidor", "nombre"),
                SearchSpecifications.field("provincia"),
                SearchSpecifications.field("canton"),
                SearchSpecifications.field("direccion"),
                SearchSpecifications.field("horarioAtencion"));
        return agenciaDistribuidorRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<AgenciaDistribuidorDTO> findByDistribuidorId(Long distribuidorId) {
        return agenciaDistribuidorRepository.findByDistribuidorIdOrderByCodigoAsc(distribuidorId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public AgenciaDistribuidorDTO findById(Long id) {
        AgenciaDistribuidor a = agenciaDistribuidorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agencia de distribuidor", id));
        return toDTO(a);
    }

    @Transactional(readOnly = true)
    public AgenciaDistribuidor findEntityById(Long id) {
        return agenciaDistribuidorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agencia de distribuidor", id));
    }

    @Transactional
    public AgenciaDistribuidorDTO create(AgenciaDistribuidorRequest request) {
        Distribuidor distribuidor = distribuidorRepository.findById(request.getDistribuidorId())
                .orElseThrow(() -> new ResourceNotFoundException("Distribuidor", request.getDistribuidorId()));
        String codigo = (request.getCodigo() != null && !request.getCodigo().isBlank())
                ? request.getCodigo().trim()
                : generarCodigo(distribuidor.getId());
        if (agenciaDistribuidorRepository.existsByDistribuidorIdAndCodigo(distribuidor.getId(), codigo)) {
            throw new BadRequestException("Ya existe una agencia con el código " + codigo + " para este distribuidor");
        }
        AgenciaDistribuidor ent = toEntity(request, distribuidor, codigo);
        ent = agenciaDistribuidorRepository.save(ent);
        versionService.crearNuevaVersion(ent, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(ent);
    }

    private String generarCodigo(Long distribuidorId) {
        long count = agenciaDistribuidorRepository.countByDistribuidorId(distribuidorId);
        String seq = String.format("AD-%03d", count + 1);
        return distribuidorId + "-" + seq;
    }

    @Transactional
    public AgenciaDistribuidorDTO update(Long id, AgenciaDistribuidorRequest request) {
        AgenciaDistribuidor ent = agenciaDistribuidorRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agencia de distribuidor", id));
        Distribuidor distribuidor = distribuidorRepository.findById(request.getDistribuidorId())
                .orElseThrow(() -> new ResourceNotFoundException("Distribuidor", request.getDistribuidorId()));
        updateEntityFromRequest(ent, request, distribuidor);
        ent = agenciaDistribuidorRepository.save(ent);
        versionService.crearNuevaVersion(ent, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(ent);
    }

    @Transactional
    public void delete(Long id) {
        if (!agenciaDistribuidorRepository.existsById(id)) {
            throw new ResourceNotFoundException("Agencia de distribuidor", id);
        }
        agenciaDistribuidorRepository.deleteById(id);
    }

    private AgenciaDistribuidor toEntity(AgenciaDistribuidorRequest r, Distribuidor distribuidor, String codigo) {
        return AgenciaDistribuidor.builder()
                .distribuidor(distribuidor)
                .codigo(codigo)
                .provincia(r.getProvincia() != null ? r.getProvincia().trim() : null)
                .canton(r.getCanton() != null ? r.getCanton().trim() : null)
                .direccion(r.getDireccion() != null ? r.getDireccion().trim() : null)
                .horarioAtencion(r.getHorarioAtencion() != null ? r.getHorarioAtencion().trim() : null)
                .diasMaxRetiro(r.getDiasMaxRetiro())
                .tarifa(r.getTarifa() != null ? r.getTarifa() : java.math.BigDecimal.ZERO)
                .build();
    }

    private void updateEntityFromRequest(AgenciaDistribuidor ent, AgenciaDistribuidorRequest r, Distribuidor distribuidor) {
        ent.setDistribuidor(distribuidor);
        ent.setProvincia(r.getProvincia() != null ? r.getProvincia().trim() : null);
        ent.setCanton(r.getCanton() != null ? r.getCanton().trim() : null);
        ent.setDireccion(r.getDireccion() != null ? r.getDireccion().trim() : null);
        ent.setHorarioAtencion(r.getHorarioAtencion() != null ? r.getHorarioAtencion().trim() : null);
        ent.setDiasMaxRetiro(r.getDiasMaxRetiro());
        ent.setTarifa(r.getTarifa() != null ? r.getTarifa() : java.math.BigDecimal.ZERO);
    }

    private static String buildEtiqueta(AgenciaDistribuidor a) {
        if (a == null) return "";
        String prov = a.getProvincia() != null ? a.getProvincia().trim() : "";
        String cant = a.getCanton() != null ? a.getCanton().trim() : "";
        String cod = a.getCodigo() != null ? a.getCodigo().trim() : "";
        List<String> parts = new ArrayList<>();
        if (!prov.isEmpty()) parts.add(prov);
        if (!cant.isEmpty()) parts.add(cant);
        String loc = String.join(", ", parts);
        if (!loc.isEmpty()) {
            return cod.isEmpty() ? loc : loc + " (" + cod + ")";
        }
        return cod.isEmpty() ? "—" : cod;
    }

    /** Para usar desde DespachoService/PDF: etiqueta de una entidad AgenciaDistribuidor. */
    public static String etiquetaDe(AgenciaDistribuidor a) {
        return buildEtiqueta(a);
    }

    private static String nombreDistribuidor(Distribuidor distribuidor) {
        return distribuidor == null ? null : distribuidor.getNombre();
    }

    private AgenciaDistribuidorDTO toDTO(AgenciaDistribuidor a) {
        Long distId = null;
        String distNombre = null;
        if (a.getDistribuidor() != null) {
            distId = a.getDistribuidor().getId();
            Distribuidor dist = distribuidorRepository.findById(distId).orElse(null);
            distNombre = nombreDistribuidor(dist);
        }
        return AgenciaDistribuidorDTO.builder()
                .id(a.getId())
                .distribuidorId(distId)
                .distribuidorNombre(distNombre)
                .codigo(a.getCodigo())
                .etiqueta(buildEtiqueta(a))
                .provincia(a.getProvincia())
                .canton(a.getCanton())
                .direccion(a.getDireccion())
                .horarioAtencion(a.getHorarioAtencion())
                .diasMaxRetiro(a.getDiasMaxRetiro())
                .tarifa(a.getTarifa())
                .build();
    }
}
