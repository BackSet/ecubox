package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * Fila de la tabla generica {@code codigo_secuencia}, usada para
 * generar refs/codigos auto-incrementales de forma atomica por
 * combinacion (entity, scope_key).
 *
 * <p>El incremento real se realiza con un UPSERT nativo en
 * {@link com.ecubox.ecubox_backend.service.CodigoSecuenciaService},
 * pero esta entidad permite consultas Spring Data convencionales
 * para inspeccion, tests y administracion.</p>
 */
@Entity
@Table(name = "codigo_secuencia")
@IdClass(CodigoSecuencia.PK.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CodigoSecuencia {

    @Id
    @Column(name = "entity", nullable = false, length = 80)
    private String entity;

    @Id
    @Column(name = "scope_key", nullable = false, length = 160)
    private String scopeKey;

    @Column(name = "next_value", nullable = false)
    private Long nextValue;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * Clave primaria compuesta exigida por {@link IdClass}.
     * Debe implementar equals/hashCode sobre los campos id.
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PK implements java.io.Serializable {
        private String entity;
        private String scopeKey;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof PK pk)) return false;
            return java.util.Objects.equals(entity, pk.entity)
                    && java.util.Objects.equals(scopeKey, pk.scopeKey);
        }

        @Override
        public int hashCode() {
            return java.util.Objects.hash(entity, scopeKey);
        }
    }
}
