package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.DestinatarioFinalVersion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface DestinatarioFinalVersionRepository extends JpaRepository<DestinatarioFinalVersion, Long> {

    /** Devuelve la version vigente (valid_to IS NULL) del destinatario indicado. */
    Optional<DestinatarioFinalVersion> findFirstByDestinatarioFinalIdAndValidToIsNull(Long destinatarioFinalId);

    /** Historial completo (inmutable) ordenado por momento de validez ascendente. */
    List<DestinatarioFinalVersion> findByDestinatarioFinalIdOrderByValidFromAsc(Long destinatarioFinalId);
}
