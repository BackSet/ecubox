package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Consignatario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ConsignatarioRepository extends JpaRepository<Consignatario, Long> {

    List<Consignatario> findByUsuarioIdOrderByNombre(Long usuarioId);

    long countByUsuarioId(Long usuarioId);

    /** Unicidad global del codigo (cualquier consignatario). */
    boolean existsByCodigo(String codigo);

    /** Unicidad global excluyendo un consignatario por id. */
    boolean existsByCodigoAndIdNot(String codigo, Long id);

    /**
     * Para operario: listar todos los consignatarios; si {@code q} no esta vacio,
     * filtra por subcadena (case-insensitive) sobre nombre, codigo, telefono,
     * direccion, provincia y canton.
     */
    @Query("""
            SELECT c FROM Consignatario c
            WHERE :q IS NULL OR :q = ''
               OR LOWER(c.nombre)    LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(c.codigo)    LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(c.telefono)  LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(c.direccion) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(c.provincia) LIKE LOWER(CONCAT('%', :q, '%'))
               OR LOWER(c.canton)    LIKE LOWER(CONCAT('%', :q, '%'))
            ORDER BY c.nombre
            """)
    List<Consignatario> findAllForOperario(@Param("q") String search);
}
