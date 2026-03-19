package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Manifiesto;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManifiestoRepository extends JpaRepository<Manifiesto, Long> {

    boolean existsByCodigo(String codigo);
}
