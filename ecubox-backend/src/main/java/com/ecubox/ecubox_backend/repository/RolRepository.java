package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Rol;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RolRepository extends JpaRepository<Rol, Long> {

    Optional<Rol> findByNombre(String nombre);

    @org.springframework.data.jpa.repository.EntityGraph(value = "Rol.permisos", type = org.springframework.data.jpa.repository.EntityGraph.EntityGraphType.FETCH)
    @Query("SELECT r FROM Rol r WHERE r.id = :id")
    Optional<Rol> findByIdWithPermisos(@Param("id") Long id);

    @org.springframework.data.jpa.repository.EntityGraph(value = "Rol.permisos", type = org.springframework.data.jpa.repository.EntityGraph.EntityGraphType.FETCH)
    @Query("SELECT r FROM Rol r")
    List<Rol> findAllWithPermisos();
}
