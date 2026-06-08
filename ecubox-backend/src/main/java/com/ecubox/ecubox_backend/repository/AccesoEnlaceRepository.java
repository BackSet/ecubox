package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.AccesoEnlace;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface AccesoEnlaceRepository extends JpaRepository<AccesoEnlace, Long> {

    @Query("SELECT e FROM AccesoEnlace e LEFT JOIN FETCH e.consignatarios WHERE e.tokenHash = :tokenHash")
    Optional<AccesoEnlace> findByTokenHashWithConsignatarios(@Param("tokenHash") String tokenHash);

    @Query("SELECT DISTINCT e FROM AccesoEnlace e LEFT JOIN FETCH e.consignatarios WHERE e.id = :id")
    Optional<AccesoEnlace> findByIdWithConsignatarios(@Param("id") Long id);

    @Query("SELECT DISTINCT e FROM AccesoEnlace e LEFT JOIN FETCH e.consignatarios " +
           "WHERE e.revocadoAt IS NULL ORDER BY e.createdAt DESC")
    List<AccesoEnlace> findActivosWithConsignatarios();
}
