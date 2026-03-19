package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.EstadoRastreoTransicion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EstadoRastreoTransicionRepository extends JpaRepository<EstadoRastreoTransicion, Long> {

    List<EstadoRastreoTransicion> findByEstadoOrigenIdAndActivoTrueOrderByEstadoDestinoOrdenAscEstadoDestinoIdAsc(Long estadoOrigenId);

    List<EstadoRastreoTransicion> findByEstadoOrigenId(Long estadoOrigenId);

    void deleteByEstadoOrigenId(Long estadoOrigenId);

    Optional<EstadoRastreoTransicion> findByEstadoOrigenIdAndEstadoDestinoIdAndActivoTrue(Long estadoOrigenId, Long estadoDestinoId);
}

