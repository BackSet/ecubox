package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.DestinatarioFinalDTO;
import com.ecubox.ecubox_backend.dto.DestinatarioFinalRequest;
import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class DestinatarioFinalService {

    private final DestinatarioFinalRepository destinatarioFinalRepository;
    private final UsuarioRepository usuarioRepository;
    private final PaqueteRepository paqueteRepository;
    private final PaqueteService paqueteService;

    public DestinatarioFinalService(DestinatarioFinalRepository destinatarioFinalRepository,
                                    UsuarioRepository usuarioRepository,
                                    PaqueteRepository paqueteRepository,
                                    PaqueteService paqueteService) {
        this.destinatarioFinalRepository = destinatarioFinalRepository;
        this.usuarioRepository = usuarioRepository;
        this.paqueteRepository = paqueteRepository;
        this.paqueteService = paqueteService;
    }

    @Transactional(readOnly = true)
    public List<DestinatarioFinalDTO> findAllByUsuarioId(Long usuarioId) {
        return destinatarioFinalRepository.findByUsuarioIdOrderByNombre(usuarioId).stream()
                .map(this::toDTO)
                .toList();
    }

    /** Para operario: listar todos los destinatarios; search opcional (nombre o código). */
    @Transactional(readOnly = true)
    public List<DestinatarioFinalDTO> findAllForOperario(String search) {
        String q = (search != null && !search.isBlank()) ? search.trim() : null;
        return destinatarioFinalRepository.findAllForOperario(q).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public DestinatarioFinalDTO findByIdAndUsuarioId(Long id, Long usuarioId) {
        DestinatarioFinal d = destinatarioFinalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new ResourceNotFoundException("Destinatario", id);
        }
        return toDTO(d);
    }

    @Transactional
    public DestinatarioFinalDTO create(Long usuarioId, DestinatarioFinalRequest request) {
        Usuario usuario = usuarioRepository.findById(usuarioId)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario", usuarioId));
        String codigo = resolveCodigo(usuarioId, request.getCodigo(), request.getNombre(), request.getCanton(), null);
        DestinatarioFinal d = DestinatarioFinal.builder()
                .usuario(usuario)
                .nombre(request.getNombre())
                .telefono(request.getTelefono())
                .direccion(request.getDireccion())
                .provincia(request.getProvincia())
                .canton(request.getCanton())
                .codigo(codigo)
                .build();
        d = destinatarioFinalRepository.save(d);
        return toDTO(d);
    }

    @Transactional(readOnly = true)
    public DestinatarioFinalDTO findById(Long id) {
        DestinatarioFinal d = destinatarioFinalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        return toDTO(d);
    }

    @Transactional
    public DestinatarioFinalDTO update(Long usuarioId, Long id, boolean canEditCodigo, DestinatarioFinalRequest request) {
        DestinatarioFinal d = destinatarioFinalRepository.findById(id)
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
        d = destinatarioFinalRepository.save(d);
        return toDTO(d);
    }

    /** Permite al operario actualizar cualquier destinatario (incl. código). */
    @Transactional
    public DestinatarioFinalDTO updateByOperario(Long id, DestinatarioFinalRequest request) {
        DestinatarioFinal d = destinatarioFinalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        String codigo = resolveCodigo(d.getUsuario().getId(), request.getCodigo(), request.getNombre(), request.getCanton(), id);
        d.setNombre(request.getNombre());
        d.setTelefono(request.getTelefono());
        d.setDireccion(request.getDireccion());
        d.setProvincia(request.getProvincia());
        d.setCanton(request.getCanton());
        d.setCodigo(codigo);
        d = destinatarioFinalRepository.save(d);
        return toDTO(d);
    }

    @Transactional
    public void delete(Long usuarioId, Long id) {
        DestinatarioFinal d = destinatarioFinalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        if (!d.getUsuario().getId().equals(usuarioId)) {
            throw new ResourceNotFoundException("Destinatario", id);
        }
        var paquetes = paqueteRepository.findByDestinatarioFinalIdOrderByIdAsc(id);
        for (var paquete : paquetes) {
            paqueteService.delete(paquete.getId(), usuarioId, false);
        }
        destinatarioFinalRepository.delete(d);
    }

    @Transactional
    public void deleteByOperario(Long id) {
        DestinatarioFinal d = destinatarioFinalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Destinatario", id));
        var paquetes = paqueteRepository.findByDestinatarioFinalIdOrderByIdAsc(id);
        for (var paquete : paquetes) {
            paqueteService.delete(paquete.getId(), d.getUsuario().getId(), true);
        }
        destinatarioFinalRepository.delete(d);
    }

    /**
     * Sugiere un código único global con formato ECU-{4 dígitos}.
     * Corto, aleatorio, único (ej. ECU-3842). Primero intenta 2 letras + 2 dígitos (descriptivo); si hay colisiones, 4 dígitos.
     */
    @Transactional(readOnly = true)
    public String sugerirCodigo(Long usuarioId, String nombre, String canton, Long excludeDestinatarioId) {
        String abrev = abrevNombre2(nombre);
        for (int i = 0; i < 100; i++) {
            int d1 = ThreadLocalRandom.current().nextInt(0, 10);
            int d2 = ThreadLocalRandom.current().nextInt(0, 10);
            String candidate = "ECU-" + abrev + d1 + d2;
            boolean exists = excludeDestinatarioId == null
                    ? destinatarioFinalRepository.existsByCodigo(candidate)
                    : destinatarioFinalRepository.existsByCodigoAndIdNot(candidate, excludeDestinatarioId);
            if (!exists) {
                return candidate;
            }
        }
        for (int i = 0; i < 100; i++) {
            String candidate = "ECU-" + String.format("%04d", ThreadLocalRandom.current().nextInt(0, 10000));
            boolean exists = excludeDestinatarioId == null
                    ? destinatarioFinalRepository.existsByCodigo(candidate)
                    : destinatarioFinalRepository.existsByCodigoAndIdNot(candidate, excludeDestinatarioId);
            if (!exists) {
                return candidate;
            }
        }
        return "ECU-" + String.format("%04d", (int) (System.currentTimeMillis() % 10000));
    }

    /** 2 letras mayúsculas a partir del nombre (iniciales o primeras letras). */
    private static String abrevNombre2(String value) {
        if (value == null || value.isBlank()) {
            return "DF";
        }
        String normalized = Normalizer.normalize(value.trim(), Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        String[] words = normalized.split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            String letters = w.replaceAll("[^\\p{IsAlphabetic}]", "");
            if (!letters.isEmpty()) {
                sb.append(Character.toUpperCase(letters.charAt(0)));
                if (sb.length() >= 2) break;
            }
        }
        if (sb.length() == 0) return "DF";
        if (sb.length() == 1) return sb.toString() + "X";
        return sb.toString();
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
                    ? destinatarioFinalRepository.existsByCodigo(trimmed)
                    : destinatarioFinalRepository.existsByCodigoAndIdNot(trimmed, excludeId);
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
                ? destinatarioFinalRepository.existsByCodigo(candidate)
                : destinatarioFinalRepository.existsByCodigoAndIdNot(candidate, excludeId)) {
            suffix++;
            candidate = base + "-" + suffix;
            if (candidate.length() > 50) {
                candidate = base.substring(0, Math.max(0, 50 - String.valueOf(suffix).length() - 1)) + "-" + suffix;
            }
        }
        return candidate;
    }

    private DestinatarioFinalDTO toDTO(DestinatarioFinal d) {
        Usuario u = d.getUsuario();
        return DestinatarioFinalDTO.builder()
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
