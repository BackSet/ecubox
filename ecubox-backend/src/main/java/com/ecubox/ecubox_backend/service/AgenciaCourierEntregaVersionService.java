package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.AgenciaCourierEntrega;
import com.ecubox.ecubox_backend.entity.AgenciaCourierEntregaVersion;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.repository.AgenciaCourierEntregaVersionRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

/**
 * Gestion de snapshots inmutables (SCD Tipo 2) de {@link AgenciaCourierEntrega}.
 * Ver {@link ConsignatarioVersionService} para la semantica completa.
 */
@Service
public class AgenciaCourierEntregaVersionService {

    private final AgenciaCourierEntregaVersionRepository versionRepository;
    private final UsuarioRepository usuarioRepository;

    public AgenciaCourierEntregaVersionService(AgenciaCourierEntregaVersionRepository versionRepository,
                                             UsuarioRepository usuarioRepository) {
        this.versionRepository = versionRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public AgenciaCourierEntregaVersion crearNuevaVersion(AgenciaCourierEntrega maestro, Long actorUsuarioId) {
        if (maestro == null || maestro.getId() == null) {
            throw new IllegalArgumentException("La agencia de courierEntrega debe estar persistida");
        }
        Optional<AgenciaCourierEntregaVersion> vigente = versionRepository
                .findFirstByAgenciaCourierEntregaIdAndValidToIsNull(maestro.getId());
        if (vigente.isPresent() && coinciden(vigente.get(), maestro)) {
            return vigente.get();
        }
        LocalDateTime now = LocalDateTime.now();
        vigente.ifPresent(v -> {
            v.setValidTo(now);
            versionRepository.save(v);
        });
        Usuario actor = resolverUsuario(actorUsuarioId);
        AgenciaCourierEntregaVersion nueva = AgenciaCourierEntregaVersion.builder()
                .agenciaCourierEntrega(maestro)
                .courierEntrega(maestro.getCourierEntrega())
                .codigo(maestro.getCodigo())
                .provincia(maestro.getProvincia())
                .canton(maestro.getCanton())
                .direccion(maestro.getDireccion())
                .horarioAtencion(maestro.getHorarioAtencion())
                .diasMaxRetiro(maestro.getDiasMaxRetiro())
                .validFrom(now)
                .validTo(null)
                .createdByUsuario(actor)
                .build();
        return versionRepository.save(nueva);
    }

    @Transactional(readOnly = true)
    public Optional<AgenciaCourierEntregaVersion> getVersionVigente(Long agenciaCourierEntregaId) {
        if (agenciaCourierEntregaId == null) return Optional.empty();
        return versionRepository.findFirstByAgenciaCourierEntregaIdAndValidToIsNull(agenciaCourierEntregaId);
    }

    private static boolean coinciden(AgenciaCourierEntregaVersion v, AgenciaCourierEntrega m) {
        Long distM = m.getCourierEntrega() != null ? m.getCourierEntrega().getId() : null;
        Long distV = v.getCourierEntrega() != null ? v.getCourierEntrega().getId() : null;
        return Objects.equals(distM, distV)
                && Objects.equals(v.getCodigo(), m.getCodigo())
                && Objects.equals(v.getProvincia(), m.getProvincia())
                && Objects.equals(v.getCanton(), m.getCanton())
                && Objects.equals(v.getDireccion(), m.getDireccion())
                && Objects.equals(v.getHorarioAtencion(), m.getHorarioAtencion())
                && Objects.equals(v.getDiasMaxRetiro(), m.getDiasMaxRetiro());
    }

    private Usuario resolverUsuario(Long actorUsuarioId) {
        if (actorUsuarioId == null) return null;
        return usuarioRepository.findById(actorUsuarioId).orElse(null);
    }
}
