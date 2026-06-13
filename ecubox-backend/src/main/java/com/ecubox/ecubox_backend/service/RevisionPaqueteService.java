package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.*;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.RevisionPaquete;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.EstadoRevisionPaquete;
import com.ecubox.ecubox_backend.enums.MotivoRevisionPaquete;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.RevisionPaqueteRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class RevisionPaqueteService {

    private final PaqueteRepository paqueteRepository;
    private final RevisionPaqueteRepository revisionPaqueteRepository;

    public RevisionPaqueteService(PaqueteRepository paqueteRepository,
                                  RevisionPaqueteRepository revisionPaqueteRepository) {
        this.paqueteRepository = paqueteRepository;
        this.revisionPaqueteRepository = revisionPaqueteRepository;
    }

    @Transactional
    public RevisionPaqueteDTO iniciar(Long paqueteId, IniciarRevisionPaqueteRequest request, Usuario usuario) {
        validarInicio(request);
        Paquete paquete = paqueteRepository.findByIdForUpdate(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        if (revisionPaqueteRepository.existsByPaqueteIdAndEstado(
                paqueteId, EstadoRevisionPaquete.EN_REVISION)) {
            throw new ConflictException("El paquete ya tiene una revisión administrativa activa.");
        }
        RevisionPaquete revision = RevisionPaquete.builder()
                .paquete(paquete)
                .motivo(request.getMotivo())
                .estado(EstadoRevisionPaquete.EN_REVISION)
                .observacionInicio(normalizar(request.getObservacion()))
                .fechaInicio(LocalDateTime.now())
                .iniciadoPor(usuario)
                .build();
        try {
            return toDTO(revisionPaqueteRepository.saveAndFlush(revision));
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("El paquete ya tiene una revisión administrativa activa.", ex);
        }
    }

    @Transactional
    public RevisionPaqueteDTO resolver(Long paqueteId, ResolverRevisionPaqueteRequest request, Usuario usuario) {
        paqueteRepository.findByIdForUpdate(paqueteId)
                .orElseThrow(() -> new ResourceNotFoundException("Paquete", paqueteId));
        RevisionPaquete revision = revisionPaqueteRepository.findActivaForUpdate(
                        paqueteId, EstadoRevisionPaquete.EN_REVISION)
                .orElseThrow(() -> new ConflictException(
                        "El paquete no tiene una revisión administrativa activa."));
        revision.setEstado(EstadoRevisionPaquete.RESUELTA);
        revision.setFechaResolucion(LocalDateTime.now());
        revision.setResueltoPor(usuario);
        revision.setObservacionResolucion(normalizar(request != null ? request.getObservacion() : null));
        return toDTO(revisionPaqueteRepository.saveAndFlush(revision));
    }

    @Transactional(readOnly = true)
    public RevisionPaqueteDTO activa(Long paqueteId) {
        if (!paqueteRepository.existsById(paqueteId)) {
            throw new ResourceNotFoundException("Paquete", paqueteId);
        }
        return revisionPaqueteRepository.findActiva(paqueteId, EstadoRevisionPaquete.EN_REVISION)
                .map(this::toDTO)
                .orElse(null);
    }

    @Transactional(readOnly = true)
    public List<RevisionPaqueteDTO> historial(Long paqueteId) {
        if (!paqueteRepository.existsById(paqueteId)) {
            throw new ResourceNotFoundException("Paquete", paqueteId);
        }
        return revisionPaqueteRepository.findHistorial(paqueteId).stream().map(this::toDTO).toList();
    }

    private void validarInicio(IniciarRevisionPaqueteRequest request) {
        if (request == null || request.getMotivo() == null) {
            throw new BadRequestException("El motivo de la revisión es obligatorio.");
        }
        if (request.getMotivo() == MotivoRevisionPaquete.OTRO
                && normalizar(request.getObservacion()) == null) {
            throw new BadRequestException(
                    "La observación de inicio es obligatoria cuando el motivo es OTRO.");
        }
    }

    private String normalizar(String valor) {
        if (valor == null) return null;
        String limpio = valor.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    public RevisionPaqueteDTO toDTO(RevisionPaquete revision) {
        Usuario iniciadoPor = revision.getIniciadoPor();
        Usuario resueltoPor = revision.getResueltoPor();
        return RevisionPaqueteDTO.builder()
                .id(revision.getId())
                .paqueteId(revision.getPaquete().getId())
                .motivo(revision.getMotivo())
                .estado(revision.getEstado())
                .observacionInicio(revision.getObservacionInicio())
                .fechaInicio(revision.getFechaInicio())
                .iniciadoPorUsuarioId(iniciadoPor != null ? iniciadoPor.getId() : null)
                .iniciadoPorUsername(iniciadoPor != null ? iniciadoPor.getUsername() : null)
                .fechaResolucion(revision.getFechaResolucion())
                .resueltoPorUsuarioId(resueltoPor != null ? resueltoPor.getId() : null)
                .resueltoPorUsername(resueltoPor != null ? resueltoPor.getUsername() : null)
                .observacionResolucion(revision.getObservacionResolucion())
                .version(revision.getVersion())
                .build();
    }
}
