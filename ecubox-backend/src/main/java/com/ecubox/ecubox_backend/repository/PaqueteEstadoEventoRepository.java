package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.PaqueteEstadoEvento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PaqueteEstadoEventoRepository extends JpaRepository<PaqueteEstadoEvento, Long> {
    List<PaqueteEstadoEvento> findByPaqueteIdOrderByOccurredAtAscIdAsc(Long paqueteId);
    java.util.Optional<PaqueteEstadoEvento> findTopByPaqueteIdOrderByOccurredAtDescIdDesc(Long paqueteId);

    /**
     * Primera (cronológicamente) entrada del paquete al estado destino indicado.
     * Útil para anclar la cuenta regresiva al primer momento en que el paquete
     * llegó al estado configurado como "Inicio de cuenta regresiva".
     */
    java.util.Optional<PaqueteEstadoEvento>
        findTopByPaqueteIdAndEstadoDestino_IdOrderByOccurredAtAscIdAsc(Long paqueteId, Long estadoDestinoId);

    void deleteByPaqueteId(Long paqueteId);

    /**
     * Eventos de tracking de todas las piezas de una guia master, en orden cronologico.
     * Usado para construir el feed agregado del endpoint de tracking de guia master.
     */
    @Query("SELECT e FROM PaqueteEstadoEvento e " +
           "WHERE e.paquete.guiaMaster.id = :guiaMasterId " +
           "ORDER BY e.occurredAt ASC, e.id ASC")
    List<PaqueteEstadoEvento> findByGuiaMasterIdOrderByOccurredAtAsc(@Param("guiaMasterId") Long guiaMasterId);

    /**
     * Eventos posteriores a {@code lastEventId} en orden ascendente, paginado por
     * la firma del proyector ({@link com.ecubox.ecubox_backend.projection.TrackingViewProjector}).
     */
    @Query("SELECT e FROM PaqueteEstadoEvento e " +
           "WHERE e.id > :lastEventId " +
           "ORDER BY e.id ASC")
    List<PaqueteEstadoEvento> findEventsAfter(@Param("lastEventId") Long lastEventId,
                                              org.springframework.data.domain.Pageable pageable);
}
