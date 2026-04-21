package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaDTO;
import com.ecubox.ecubox_backend.dto.AgenciaCourierEntregaRequest;
import com.ecubox.ecubox_backend.entity.AgenciaCourierEntrega;
import com.ecubox.ecubox_backend.entity.CourierEntrega;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.AgenciaCourierEntregaRepository;
import com.ecubox.ecubox_backend.repository.CourierEntregaRepository;
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
public class AgenciaCourierEntregaService {

    private final AgenciaCourierEntregaRepository agenciaCourierEntregaRepository;
    private final CourierEntregaRepository courierEntregaRepository;
    private final AgenciaCourierEntregaVersionService versionService;
    private final CurrentUserService currentUserService;
    private final CodigoSecuenciaService codigoSecuenciaService;

    public AgenciaCourierEntregaService(AgenciaCourierEntregaRepository agenciaCourierEntregaRepository,
                                      CourierEntregaRepository courierEntregaRepository,
                                      AgenciaCourierEntregaVersionService versionService,
                                      CurrentUserService currentUserService,
                                      CodigoSecuenciaService codigoSecuenciaService) {
        this.agenciaCourierEntregaRepository = agenciaCourierEntregaRepository;
        this.courierEntregaRepository = courierEntregaRepository;
        this.versionService = versionService;
        this.currentUserService = currentUserService;
        this.codigoSecuenciaService = codigoSecuenciaService;
    }

    @Transactional(readOnly = true)
    public List<AgenciaCourierEntregaDTO> findAll() {
        return agenciaCourierEntregaRepository.findAll().stream()
                .map(this::toDTO)
                .toList();
    }

    /**
     * Lista paginada con búsqueda libre (LIKE multi-token) sobre código,
     * nombre del courierEntrega relacionado, provincia, cantón, dirección y
     * horario de atención. La entidad no tiene campo {@code nombre}; el
     * código identifica la agencia.
     */
    @Transactional(readOnly = true)
    public Page<AgenciaCourierEntregaDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = PageRequest.of(Math.max(0, page),
                Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.ASC, "codigo").and(Sort.by(Sort.Direction.ASC, "id")));
        Specification<AgenciaCourierEntrega> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("codigo"),
                SearchSpecifications.path("courierEntrega", "nombre"),
                SearchSpecifications.field("provincia"),
                SearchSpecifications.field("canton"),
                SearchSpecifications.field("direccion"),
                SearchSpecifications.field("horarioAtencion"));
        return agenciaCourierEntregaRepository.findAll(spec, pageable).map(this::toDTO);
    }

    @Transactional(readOnly = true)
    public List<AgenciaCourierEntregaDTO> findByCourierEntregaId(Long courierEntregaId) {
        return agenciaCourierEntregaRepository.findByCourierEntregaIdOrderByCodigoAsc(courierEntregaId).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public AgenciaCourierEntregaDTO findById(Long id) {
        AgenciaCourierEntrega a = agenciaCourierEntregaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agencia de courierEntrega", id));
        return toDTO(a);
    }

    @Transactional(readOnly = true)
    public AgenciaCourierEntrega findEntityById(Long id) {
        return agenciaCourierEntregaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agencia de courierEntrega", id));
    }

    @Transactional
    public AgenciaCourierEntregaDTO create(AgenciaCourierEntregaRequest request) {
        CourierEntrega courierEntrega = courierEntregaRepository.findById(request.getCourierEntregaId())
                .orElseThrow(() -> new ResourceNotFoundException("CourierEntrega", request.getCourierEntregaId()));
        String codigo = (request.getCodigo() != null && !request.getCodigo().isBlank())
                ? request.getCodigo().trim()
                : generarCodigo(courierEntrega.getId());
        if (agenciaCourierEntregaRepository.existsByCourierEntregaIdAndCodigo(courierEntrega.getId(), codigo)) {
            throw new BadRequestException("Ya existe una agencia con el código " + codigo + " para este courierEntrega");
        }
        AgenciaCourierEntrega ent = toEntity(request, courierEntrega, codigo);
        ent = agenciaCourierEntregaRepository.save(ent);
        versionService.crearNuevaVersion(ent, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(ent);
    }

    private String generarCodigo(Long courierEntregaId) {
        return codigoSecuenciaService.nextCodigoAgencia(courierEntregaId);
    }

    @Transactional
    public AgenciaCourierEntregaDTO update(Long id, AgenciaCourierEntregaRequest request) {
        AgenciaCourierEntrega ent = agenciaCourierEntregaRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Agencia de courierEntrega", id));
        CourierEntrega courierEntrega = courierEntregaRepository.findById(request.getCourierEntregaId())
                .orElseThrow(() -> new ResourceNotFoundException("CourierEntrega", request.getCourierEntregaId()));
        updateEntityFromRequest(ent, request, courierEntrega);
        ent = agenciaCourierEntregaRepository.save(ent);
        versionService.crearNuevaVersion(ent, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(ent);
    }

    @Transactional
    public void delete(Long id) {
        if (!agenciaCourierEntregaRepository.existsById(id)) {
            throw new ResourceNotFoundException("Agencia de courierEntrega", id);
        }
        agenciaCourierEntregaRepository.deleteById(id);
    }

    private AgenciaCourierEntrega toEntity(AgenciaCourierEntregaRequest r, CourierEntrega courierEntrega, String codigo) {
        return AgenciaCourierEntrega.builder()
                .courierEntrega(courierEntrega)
                .codigo(codigo)
                .provincia(r.getProvincia() != null ? r.getProvincia().trim() : null)
                .canton(r.getCanton() != null ? r.getCanton().trim() : null)
                .direccion(r.getDireccion() != null ? r.getDireccion().trim() : null)
                .horarioAtencion(r.getHorarioAtencion() != null ? r.getHorarioAtencion().trim() : null)
                .diasMaxRetiro(r.getDiasMaxRetiro())
                .build();
    }

    private void updateEntityFromRequest(AgenciaCourierEntrega ent, AgenciaCourierEntregaRequest r, CourierEntrega courierEntrega) {
        ent.setCourierEntrega(courierEntrega);
        ent.setProvincia(r.getProvincia() != null ? r.getProvincia().trim() : null);
        ent.setCanton(r.getCanton() != null ? r.getCanton().trim() : null);
        ent.setDireccion(r.getDireccion() != null ? r.getDireccion().trim() : null);
        ent.setHorarioAtencion(r.getHorarioAtencion() != null ? r.getHorarioAtencion().trim() : null);
        ent.setDiasMaxRetiro(r.getDiasMaxRetiro());
    }

    private static String buildEtiqueta(AgenciaCourierEntrega a) {
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

    /** Para usar desde DespachoService/PDF: etiqueta de una entidad AgenciaCourierEntrega. */
    public static String etiquetaDe(AgenciaCourierEntrega a) {
        return buildEtiqueta(a);
    }

    private static String nombreCourierEntrega(CourierEntrega courierEntrega) {
        return courierEntrega == null ? null : courierEntrega.getNombre();
    }

    private AgenciaCourierEntregaDTO toDTO(AgenciaCourierEntrega a) {
        Long distId = null;
        String distNombre = null;
        if (a.getCourierEntrega() != null) {
            distId = a.getCourierEntrega().getId();
            CourierEntrega dist = courierEntregaRepository.findById(distId).orElse(null);
            distNombre = nombreCourierEntrega(dist);
        }
        return AgenciaCourierEntregaDTO.builder()
                .id(a.getId())
                .courierEntregaId(distId)
                .courierEntregaNombre(distNombre)
                .codigo(a.getCodigo())
                .etiqueta(buildEtiqueta(a))
                .provincia(a.getProvincia())
                .canton(a.getCanton())
                .direccion(a.getDireccion())
                .horarioAtencion(a.getHorarioAtencion())
                .diasMaxRetiro(a.getDiasMaxRetiro())
                .build();
    }
}
