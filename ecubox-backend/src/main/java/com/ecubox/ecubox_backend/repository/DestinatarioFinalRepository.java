package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.DestinatarioFinal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DestinatarioFinalRepository extends JpaRepository<DestinatarioFinal, Long> {

    List<DestinatarioFinal> findByUsuarioIdOrderByNombre(Long usuarioId);

    long countByUsuarioId(Long usuarioId);

    /** Unicidad global del código (cualquier destinatario). */
    boolean existsByCodigo(String codigo);

    /** Unicidad global excluyendo un destinatario por id. */
    boolean existsByCodigoAndIdNot(String codigo, Long id);

    /**
     * Para operario: listar todos los destinatarios; si {@code q} no está vacío,
     * filtra por subcadena (case-insensitive) sobre nombre, código, teléfono,
     * dirección, provincia y cantón. Esto refleja exactamente lo que anuncia
     * el placeholder del listado en el frontend.
     */
    @Query("""
            SELECT d FROM DestinatarioFinal d
            WHERE :q IS NULL OR :q = ''
               OR LOWER(d.nombre)    LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(d.codigo)    LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(d.telefono)  LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(d.direccion) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(d.provincia) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(d.canton)    LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY d.nombre
            """)
    List<DestinatarioFinal> findAllForOperario(@Param("q") String search);
}
