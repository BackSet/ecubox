package com.ecubox.ecubox_backend.repository;

import com.ecubox.ecubox_backend.entity.Usuario;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    @Query("SELECT DISTINCT u FROM Usuario u LEFT JOIN FETCH u.roles WHERE u.id = :id")
    Optional<Usuario> findByIdWithRoles(@Param("id") Long id);

    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.roles r LEFT JOIN FETCH r.permisos WHERE u.username = :username")
    Optional<Usuario> findByUsernameWithRolesAndPermisos(@Param("username") String username);

    @org.springframework.data.jpa.repository.EntityGraph(value = "Usuario.roles", type = org.springframework.data.jpa.repository.EntityGraph.EntityGraphType.FETCH)
    @Query("SELECT u FROM Usuario u")
    java.util.List<Usuario> findAllWithRoles();

    boolean existsByEmailIgnoreCase(String email);

    @Query("SELECT u FROM Usuario u LEFT JOIN FETCH u.roles r LEFT JOIN FETCH r.permisos WHERE LOWER(u.email) = LOWER(:email)")
    Optional<Usuario> findByEmailIgnoreCaseWithRolesAndPermisos(@Param("email") String email);
}
