package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.Agencia;
import com.ecubox.ecubox_backend.entity.AgenciaVersion;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.repository.AgenciaVersionRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

/**
 * Gestion de snapshots inmutables (SCD Tipo 2) de {@link Agencia}.
 * Ver {@link DestinatarioVersionService} para la semantica completa.
 */
@Service
public class AgenciaVersionService {

    private final AgenciaVersionRepository versionRepository;
    private final UsuarioRepository usuarioRepository;

    public AgenciaVersionService(AgenciaVersionRepository versionRepository,
                                 UsuarioRepository usuarioRepository) {
        this.versionRepository = versionRepository;
        this.usuarioRepository = usuarioRepository;
    }

    @Transactional
    public AgenciaVersion crearNuevaVersion(Agencia maestro, Long actorUsuarioId) {
        if (maestro == null || maestro.getId() == null) {
            throw new IllegalArgumentException("La agencia debe estar persistida");
        }
        Optional<AgenciaVersion> vigente = versionRepository
                .findFirstByAgenciaIdAndValidToIsNull(maestro.getId());
        if (vigente.isPresent() && coinciden(vigente.get(), maestro)) {
            return vigente.get();
        }
        LocalDateTime now = LocalDateTime.now();
        vigente.ifPresent(v -> {
            v.setValidTo(now);
            versionRepository.save(v);
        });
        Usuario actor = resolverUsuario(actorUsuarioId);
        AgenciaVersion nueva = AgenciaVersion.builder()
                .agencia(maestro)
                .nombre(maestro.getNombre())
                .encargado(maestro.getEncargado())
                .codigo(maestro.getCodigo())
                .direccion(maestro.getDireccion())
                .provincia(maestro.getProvincia())
                .canton(maestro.getCanton())
                .horarioAtencion(maestro.getHorarioAtencion())
                .diasMaxRetiro(maestro.getDiasMaxRetiro())
                .tarifaServicio(maestro.getTarifaServicio() != null ? maestro.getTarifaServicio() : BigDecimal.ZERO)
                .validFrom(now)
                .validTo(null)
                .createdByUsuario(actor)
                .build();
        return versionRepository.save(nueva);
    }

    @Transactional(readOnly = true)
    public Optional<AgenciaVersion> getVersionVigente(Long agenciaId) {
        if (agenciaId == null) return Optional.empty();
        return versionRepository.findFirstByAgenciaIdAndValidToIsNull(agenciaId);
    }

    private static boolean coinciden(AgenciaVersion v, Agencia m) {
        return Objects.equals(v.getNombre(), m.getNombre())
                && Objects.equals(v.getEncargado(), m.getEncargado())
                && Objects.equals(v.getCodigo(), m.getCodigo())
                && Objects.equals(v.getDireccion(), m.getDireccion())
                && Objects.equals(v.getProvincia(), m.getProvincia())
                && Objects.equals(v.getCanton(), m.getCanton())
                && Objects.equals(v.getHorarioAtencion(), m.getHorarioAtencion())
                && Objects.equals(v.getDiasMaxRetiro(), m.getDiasMaxRetiro())
                && comparaBigDecimal(v.getTarifaServicio(), m.getTarifaServicio());
    }

    private static boolean comparaBigDecimal(BigDecimal a, BigDecimal b) {
        if (a == null && b == null) return true;
        if (a == null || b == null) return false;
        return a.compareTo(b) == 0;
    }

    private Usuario resolverUsuario(Long actorUsuarioId) {
        if (actorUsuarioId == null) return null;
        return usuarioRepository.findById(actorUsuarioId).orElse(null);
    }
}
