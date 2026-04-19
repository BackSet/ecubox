package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import com.ecubox.ecubox_backend.entity.DestinatarioFinalVersion;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.repository.DestinatarioFinalVersionRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Objects;
import java.util.Optional;

/**
 * Gestion de snapshots inmutables (SCD Tipo 2) de {@link DestinatarioFinal}.
 *
 * <p>Cada UPDATE del maestro debe llamar {@link #crearNuevaVersion} para
 * cerrar la version vigente y abrir una nueva. Es idempotente: si los
 * datos del maestro no han cambiado respecto a la version vigente, no
 * crea ningun snapshot redundante.</p>
 */
@Service
public class DestinatarioVersionService {

    private final DestinatarioFinalVersionRepository versionRepository;
    private final UsuarioRepository usuarioRepository;

    public DestinatarioVersionService(DestinatarioFinalVersionRepository versionRepository,
                                      UsuarioRepository usuarioRepository) {
        this.versionRepository = versionRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Crea una nueva version del destinatario si los datos cambiaron, o
     * inicializa una version inicial si todavia no existe ninguna.
     *
     * @param maestro          destinatario "vivo" recien guardado.
     * @param actorUsuarioId   usuario que disparo el cambio (para auditoria); puede ser null.
     * @return la version vigente despues de la operacion (la nueva si se creo, o la existente si era idempotente).
     */
    @Transactional
    public DestinatarioFinalVersion crearNuevaVersion(DestinatarioFinal maestro, Long actorUsuarioId) {
        if (maestro == null || maestro.getId() == null) {
            throw new IllegalArgumentException("El destinatario debe estar persistido");
        }
        Optional<DestinatarioFinalVersion> vigente = versionRepository
                .findFirstByDestinatarioFinalIdAndValidToIsNull(maestro.getId());

        // Idempotencia: si la version vigente coincide en todos los campos
        // de negocio con el maestro, no creamos un snapshot vacio.
        if (vigente.isPresent() && coinciden(vigente.get(), maestro)) {
            return vigente.get();
        }

        LocalDateTime now = LocalDateTime.now();
        vigente.ifPresent(v -> {
            v.setValidTo(now);
            versionRepository.save(v);
        });

        Usuario actor = resolverUsuario(actorUsuarioId);
        DestinatarioFinalVersion nueva = DestinatarioFinalVersion.builder()
                .destinatarioFinal(maestro)
                .nombre(maestro.getNombre())
                .telefono(maestro.getTelefono())
                .direccion(maestro.getDireccion())
                .provincia(maestro.getProvincia())
                .canton(maestro.getCanton())
                .codigo(maestro.getCodigo())
                .validFrom(now)
                .validTo(null)
                .createdByUsuario(actor)
                .build();
        return versionRepository.save(nueva);
    }

    /** Devuelve la version vigente del destinatario, o vacio si no hay ninguna todavia. */
    @Transactional(readOnly = true)
    public Optional<DestinatarioFinalVersion> getVersionVigente(Long destinatarioFinalId) {
        if (destinatarioFinalId == null) return Optional.empty();
        return versionRepository.findFirstByDestinatarioFinalIdAndValidToIsNull(destinatarioFinalId);
    }

    private static boolean coinciden(DestinatarioFinalVersion v, DestinatarioFinal m) {
        return Objects.equals(v.getNombre(), m.getNombre())
                && Objects.equals(v.getTelefono(), m.getTelefono())
                && Objects.equals(v.getDireccion(), m.getDireccion())
                && Objects.equals(v.getProvincia(), m.getProvincia())
                && Objects.equals(v.getCanton(), m.getCanton())
                && Objects.equals(v.getCodigo(), m.getCodigo());
    }

    private Usuario resolverUsuario(Long actorUsuarioId) {
        if (actorUsuarioId == null) return null;
        return usuarioRepository.findById(actorUsuarioId).orElse(null);
    }
}
