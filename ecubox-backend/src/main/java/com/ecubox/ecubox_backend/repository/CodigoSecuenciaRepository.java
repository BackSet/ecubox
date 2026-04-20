package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.CodigoSecuencia;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Repositorio basico para {@link CodigoSecuencia}. La operacion atomica
 * de incremento (UPSERT con {@code ON CONFLICT ... RETURNING}) se
 * implementa via {@link jakarta.persistence.EntityManager} en
 * {@link com.ecubox.ecubox_backend.service.CodigoSecuenciaService},
 * porque Spring Data JPA no soporta nativamente el binding de la
 * clausula {@code RETURNING} en metodos {@code @Modifying}.
 */
public interface CodigoSecuenciaRepository extends JpaRepository<CodigoSecuencia, CodigoSecuencia.PK> {
}
