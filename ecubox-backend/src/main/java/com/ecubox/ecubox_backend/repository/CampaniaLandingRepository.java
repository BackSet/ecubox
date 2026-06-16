package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.CampaniaLanding;
import com.ecubox.ecubox_backend.enums.EstadoCampaniaLanding;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface CampaniaLandingRepository extends JpaRepository<CampaniaLanding, Long> {

    List<CampaniaLanding> findAllByOrderByActualizadaAtDesc();

    Optional<CampaniaLanding> findFirstByEstado(EstadoCampaniaLanding estado);

    /**
     * Carga la campaña publicada con lock pesimista para la transacción de
     * publicación (evita que dos publicaciones concurrentes dejen dos PUBLICADA;
     * el índice único parcial es la defensa final).
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM CampaniaLanding c WHERE c.estado = 'PUBLICADA'")
    Optional<CampaniaLanding> lockPublicada();
}
