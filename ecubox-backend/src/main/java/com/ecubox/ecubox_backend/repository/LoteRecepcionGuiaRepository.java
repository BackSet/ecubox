package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.LoteRecepcionGuia;

public interface LoteRecepcionGuiaRepository extends org.springframework.data.jpa.repository.JpaRepository<LoteRecepcionGuia, Long> {

    boolean existsByNumeroGuiaEnvio(String numeroGuiaEnvio);
}
