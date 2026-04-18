package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DestinatarioFinalRepository extends JpaRepository<DestinatarioFinal, Long> {

    List<DestinatarioFinal> findByUsuarioIdOrderByNombre(Long usuarioId);

    long countByUsuarioId(Long usuarioId);

    boolean existsByUsuarioIdAndCodigo(Long usuarioId, String codigo);

    boolean existsByUsuarioIdAndCodigoAndIdNot(Long usuarioId, String codigo, Long id);

    /** Unicidad global del código (cualquier destinatario). */
    boolean existsByCodigo(String codigo);

    /** Unicidad global excluyendo un destinatario por id. */
    boolean existsByCodigoAndIdNot(String codigo, Long id);

    /** Para operario: listar todos; si q no está vacío, filtrar por nombre o código. */
    @Query("SELECT d FROM DestinatarioFinal d WHERE :q IS NULL OR :q = '' OR LOWER(d.nombre) LIKE LOWER(CONCAT('%', :q, '%')) OR LOWER(d.codigo) LIKE LOWER(CONCAT('%', :q, '%')) ORDER BY d.nombre")
    List<DestinatarioFinal> findAllForOperario(@Param("q") String search);
}
