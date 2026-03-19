package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "parametro_sistema")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ParametroSistema {

    @Id
    @Column(name = "clave", length = 255)
    private String clave;

    @Column(name = "valor", columnDefinition = "TEXT")
    private String valor;
}
