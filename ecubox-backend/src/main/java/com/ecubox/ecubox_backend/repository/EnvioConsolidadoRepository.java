package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EnvioConsolidadoRepository extends JpaRepository<EnvioConsolidado, Long> {

    Optional<EnvioConsolidado> findByCodigoIgnoreCase(String codigo);

    boolean existsByCodigoIgnoreCase(String codigo);

    /** Solo envios abiertos (no cerrados): {@code fecha_cerrado IS NULL}. */
    Page<EnvioConsolidado> findByFechaCerradoIsNull(Pageable pageable);

    /** Solo envios cerrados historicamente: {@code fecha_cerrado IS NOT NULL}. */
    Page<EnvioConsolidado> findByFechaCerradoIsNotNull(Pageable pageable);
}
