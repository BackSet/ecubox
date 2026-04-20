package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.ConsignatarioRequest;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class ConsignatarioService {

    private final ConsignatarioRepository consignatarioRepository;
    private final UsuarioRepository usuarioRepository;
    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;
    private final ConsignatarioVersionService consignatarioVersionService;
    private final CurrentUserService currentUserService;
    private final CodigoSecuenciaService codigoSecuenciaService;

    public ConsignatarioService(ConsignatarioRepository consignatarioRepository,
                                    UsuarioRepository usuarioRepository,
                                    PaqueteRepository paqueteRepository,
                                    PaqueteService paqueteService,
                                    ConsignatarioVersionService consignatarioVersionService,
                                    CurrentUserService currentUserService,
                                    CodigoSecuenciaService codigoSecuenciaService) {
        this.consignatarioRepository = consignatarioRepository;
        this.usuarioRepository = usuarioRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
        this.consignatarioVersionService = consignatarioVersionService;
        this.currentUserService = currentUserService;
        this.codigoSecuenciaService = codigoSecuenciaService;
    }

    @Transactional(readOnly = true)
    public List<ConsignatarioDTO> findAllByUsuarioId(Long usuarioId) {
        return consignatarioRepository.findByUsuarioIdOrderByNombre(usuarioId).stream()
                .map(this::toDTO)
                .toList();
    }

    /** Para operario: listar todos los destinatarios; search opcional (nombre o código). */
    @Transactional(readOnly = true)
    public List<ConsignatarioDTO> findAllForOperario(String search) {
        String q = (search != null && !search.isBlank()) ? search.trim() : null;
        return consignatarioRepository.findAllForOperario(q).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public ConsignatarioDTO findByIdAndUsuarioId(Long id, Long usuarioId) {
        Consignatario d = consignatarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new ResourceNotFoundException("Destinatario", id);
        }
        return toDTO(d);
    }

    @Transactional
    public ConsignatarioDTO create(Long usuarioId, ConsignatarioRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", usuarioId));
        String codigo = resolveCodigo(usuarioId, request.getCodigo(), request.getNombre(), request.getCanton(), null);
        Consignatario d = Consignatario.builder()
                .usuario(usuario)
                .nombre(request.getNombre())
                .telefono(request.getTelefono())
                .direccion(request.getDireccion())
                .provincia(request.getProvincia())
                .canton(request.getCanton())
                .codigo(codigo)
                .build();
        d = consignatarioRepository.save(d);
        consignatarioVersionService.crearNuevaVersion(d, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(d);
    }

    @Transactional(readOnly = true)
    public ConsignatarioDTO findById(Long id) {
        Consignatario d = consignatarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        return toDTO(d);
    }

    @Transactional
    public ConsignatarioDTO update(Long usuarioId, Long id, boolean canEditCodigo, ConsignatarioRequest request) {
        Consignatario d = consignatarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new ResourceNotFoundException("Destinatario", id);
        }
        d.setNombre(request.getNombre());
        d.setTelefono(request.getTelefono());
        d.setDireccion(request.getDireccion());
        d.setProvincia(request.getProvincia());
        d.setCanton(request.getCanton());
        if (canEditCodigo) {
            String codigo = resolveCodigo(usuarioId, request.getCodigo(), request.getNombre(), request.getCanton(), id);
            d.setCodigo(codigo);
        }
        d = consignatarioRepository.save(d);
        consignatarioVersionService.crearNuevaVersion(d, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(d);
    }

    /** Permite al operario actualizar cualquier destinatario (incl. código). */
    @Transactional
    public ConsignatarioDTO updateByOperario(Long id, ConsignatarioRequest request) {
        Consignatario d = consignatarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        String codigo = resolveCodigo(d.getUsuario().getId(), request.getCodigo(), request.getNombre(), request.getCanton(), id);
        d.setNombre(request.getNombre());
        d.setTelefono(request.getTelefono());
        d.setDireccion(request.getDireccion());
        d.setProvincia(request.getProvincia());
        d.setCanton(request.getCanton());
        d.setCodigo(codigo);
        d = consignatarioRepository.save(d);
        consignatarioVersionService.crearNuevaVersion(d, currentUserService.getCurrentUsuarioIdOrNull());
        return toDTO(d);
    }

    @Transactional
    public void delete(Long usuarioId, Long id) {
        Consignatario d = consignatarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new ResourceNotFoundException("Destinatario", id);
        }
        var paquetes = paqueteRepository.findByConsignatarioIdOrderByIdAsc(id);
        for (var paquete : paquetes) {
            paqueteService.delete(paquete.getId(), usuarioId, false);
        }
        consignatarioRepository.delete(d);
    }

    @Transactional
    public void deleteByOperario(Long id) {
        Consignatario d = consignatarioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        var paquetes = paqueteRepository.findByConsignatarioIdOrderByIdAsc(id);
        for (var paquete : paquetes) {
            paqueteService.delete(paquete.getId(), d.getUsuario().getId(), true);
        }
        consignatarioRepository.delete(d);
    }

    /**
     * Sugiere un código único global con formato {@code ECU-NNNN}, generado
     * de forma atómica por {@link CodigoSecuenciaService}. Reemplaza el
     * antiguo bucle de candidatos aleatorios; el número entregado es único
     * incluso bajo concurrencia.
     *
     * <p>Los parámetros {@code usuarioId}, {@code nombre}, {@code canton}
     * y {@code excludeDestinatarioId} se conservan por compatibilidad con
     * el endpoint público pero ya no influyen en el código generado: la
     * secuencia es global y arranca por encima del espacio histórico
     * aleatorio (10001+).</p>
     */
    public String sugerirCodigo(Long usuarioId, String nombre, String canton, Long excludeDestinatarioId) {
        return codigoSecuenciaService.nextCodigoConsignatario();
    }

    /**
     * Si codigo viene informado y no está en blanco, se usa tal cual (único global; si existe se añade sufijo).
     * Si está vacío, se genera con formato ECU-{descriptivo} vía sugerirCodigo.
     */
    private String resolveCodigo(Long usuarioId, String codigoRequest, String nombre, String canton, Long excludeId) {
        if (codigoRequest != null && !codigoRequest.isBlank()) {
            String trimmed = codigoRequest.trim();
            if (!trimmed.startsWith("ECU-")) {
                trimmed = "ECU-" + trimmed;
            }
            boolean exists = excludeId == null
                    ? consignatarioRepository.existsByCodigo(trimmed)
                    : consignatarioRepository.existsByCodigoAndIdNot(trimmed, excludeId);
            if (exists) {
                return generateUniqueCodigoGlobal(trimmed, excludeId);
            }
            return trimmed;
        }
        return sugerirCodigo(usuarioId, nombre, canton, excludeId);
    }

    private String generateUniqueCodigoGlobal(String base, Long excludeId) {
        String candidate = base;
        int suffix = 1;
        while (excludeId == null
                ? consignatarioRepository.existsByCodigo(candidate)
                : consignatarioRepository.existsByCodigoAndIdNot(candidate, excludeId)) {
            suffix++;
            candidate = base + "-" + suffix;
            if (candidate.length() > 50) {
                candidate = base.substring(0, Math.max(0, 50 - String.valueOf(suffix).length() - 1)) + "-" + suffix;
            }
        }
        return candidate;
    }

    private ConsignatarioDTO toDTO(Consignatario d) {
        Usuario u = d.getUsuario();
        return ConsignatarioDTO.builder()
                .id(d.getId())
                .nombre(d.getNombre())
                .telefono(d.getTelefono())
                .direccion(d.getDireccion())
                .provincia(d.getProvincia())
                .canton(d.getCanton())
                .codigo(d.getCodigo())
                .clienteUsuarioId(u != null ? u.getId() : null)
                .clienteUsuarioNombre(u != null ? u.getUsername() : null)
                .build();
    }
}
