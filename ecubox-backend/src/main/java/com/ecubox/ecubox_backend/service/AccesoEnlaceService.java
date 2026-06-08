package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.AccesoEnlaceDTO;
import com.ecubox.ecubox_backend.dto.AccesoResumenDTO;
import com.ecubox.ecubox_backend.dto.ConsignatarioResumenDTO;
import com.ecubox.ecubox_backend.dto.GenerarAccesoEnlaceRequest;
import com.ecubox.ecubox_backend.dto.GenerarAccesoEnlaceResponse;
import com.ecubox.ecubox_backend.entity.AccesoEnlace;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.TipoAccesoEnlace;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.AccesoEnlaceRepository;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Comparator;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.List;
import java.util.Set;

/**
 * Gestión de enlaces de acceso sin registro acotados a consignatarios:
 * generación, validación (canje), listado y revocación. Solo se persiste el
 * hash del token.
 */
@Service
public class AccesoEnlaceService {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32; // 256 bits de entropía

    private final AccesoEnlaceRepository enlaceRepository;
    private final ConsignatarioRepository consignatarioRepository;
    private final UsuarioRepository usuarioRepository;

    public AccesoEnlaceService(AccesoEnlaceRepository enlaceRepository,
                               ConsignatarioRepository consignatarioRepository,
                               UsuarioRepository usuarioRepository) {
        this.enlaceRepository = enlaceRepository;
        this.consignatarioRepository = consignatarioRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public GenerarAccesoEnlaceResponse generar(GenerarAccesoEnlaceRequest request,
                                               Long creadoPorUsuarioId) {
        List<Consignatario> consignatarios =
                consignatarioRepository.findAllById(request.getConsignatarioIds());
        if (consignatarios.size() != new HashSet<>(request.getConsignatarioIds()).size()) {
            throw new BadRequestException("Uno o más consignatarios no existen");
        }
        if (consignatarios.isEmpty()) {
            throw new BadRequestException("Debe seleccionar al menos un consignatario");
        }

        LocalDateTime expiraAt = null;
        if (request.getTipo() == TipoAccesoEnlace.TEMPORAL) {
            if (request.getDuracionHoras() == null || request.getDuracionHoras() <= 0) {
                throw new BadRequestException("Un enlace temporal requiere una duración en horas mayor que cero");
            }
            expiraAt = LocalDateTime.now().plusHours(request.getDuracionHoras());
        }

        String tokenPlano = generarTokenPlano();

        AccesoEnlace enlace = AccesoEnlace.builder()
                .tokenHash(hash(tokenPlano))
                .token(tokenPlano)
                .tipo(request.getTipo())
                .etiqueta(request.getEtiqueta())
                .expiraAt(expiraAt)
                .consignatarios(new HashSet<>(consignatarios))
                .creadoPor(creadoPorUsuarioId != null
                        ? usuarioRepository.getReferenceById(creadoPorUsuarioId)
                        : null)
                .build();

        enlace = enlaceRepository.save(enlace);

        return GenerarAccesoEnlaceResponse.builder()
                .token(tokenPlano)
                .enlace(toDTO(enlace))
                .build();
    }

    /**
     * Valida el token de un enlace y devuelve la entidad (con consignatarios)
     * si está vigente. Registra el último acceso.
     */
    @Transactional
    public AccesoEnlace canjear(String tokenPlano) {
        AccesoEnlace enlace = enlaceRepository.findByTokenHashWithConsignatarios(hash(tokenPlano))
                .orElseThrow(() -> new BadRequestException("Enlace de acceso inválido"));
        if (!enlace.isVigente()) {
            throw new BadRequestException("El enlace de acceso ha expirado o fue revocado");
        }
        enlace.setUltimoAccesoAt(LocalDateTime.now());
        enlaceRepository.save(enlace);
        return enlace;
    }

    /**
     * Devuelve el enlace vigente por id para una sesión de lectura; lanza
     * {@link BadRequestException} si fue revocado o caducó (revocación inmediata).
     */
    @Transactional(readOnly = true)
    public AccesoEnlace obtenerVigente(Long enlaceId) {
        AccesoEnlace enlace = enlaceRepository.findByIdWithConsignatarios(enlaceId)
                .orElseThrow(() -> new BadRequestException("Enlace de acceso inválido"));
        if (!enlace.isVigente()) {
            throw new BadRequestException("El enlace de acceso ha expirado o fue revocado");
        }
        return enlace;
    }

    @Transactional(readOnly = true)
    public List<AccesoEnlaceDTO> listar() {
        return enlaceRepository.findActivosWithConsignatarios().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public void revocar(Long enlaceId) {
        AccesoEnlace enlace = enlaceRepository.findById(enlaceId)
                .orElseThrow(() -> new ResourceNotFoundException("Enlace de acceso", enlaceId));
        if (enlace.getRevocadoAt() == null) {
            enlace.setRevocadoAt(LocalDateTime.now());
            enlaceRepository.save(enlace);
        }
    }

    /** Resumen para el titular del enlace (consignatarios y caducidad). */
    public AccesoResumenDTO toResumen(AccesoEnlace enlace) {
        return AccesoResumenDTO.builder()
                .etiqueta(enlace.getEtiqueta())
                .tipo(enlace.getTipo())
                .expiraAt(enlace.getExpiraAt())
                .consignatarios(consignatariosResumen(enlace))
                .build();
    }

    private String generarTokenPlano() {
        byte[] bytes = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private String hash(String tokenPlano) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(tokenPlano.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 no disponible", e);
        }
    }

    private List<ConsignatarioResumenDTO> consignatariosResumen(AccesoEnlace enlace) {
        return enlace.getConsignatarios().stream()
                .sorted(Comparator.comparing(Consignatario::getNombre, String.CASE_INSENSITIVE_ORDER))
                .map(c -> ConsignatarioResumenDTO.builder()
                        .id(c.getId())
                        .nombre(c.getNombre())
                        .codigo(c.getCodigo())
                        .build())
                .toList();
    }

    private AccesoEnlaceDTO toDTO(AccesoEnlace e) {
        return AccesoEnlaceDTO.builder()
                .id(e.getId())
                .token(e.getToken())
                .tipo(e.getTipo())
                .etiqueta(e.getEtiqueta())
                .expiraAt(e.getExpiraAt())
                .createdAt(e.getCreatedAt())
                .ultimoAccesoAt(e.getUltimoAccesoAt())
                .vigente(e.isVigente())
                .consignatarios(consignatariosResumen(e))
                .creadoPor(e.getCreadoPor() != null ? e.getCreadoPor().getUsername() : null)
                .build();
    }

    /** Ids de los consignatarios cubiertos por el enlace. */
    public Set<Long> consignatarioIds(AccesoEnlace enlace) {
        Set<Long> ids = new HashSet<>();
        for (Consignatario c : enlace.getConsignatarios()) {
            ids.add(c.getId());
        }
        return ids;
    }
}
