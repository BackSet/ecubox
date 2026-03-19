package com.ecubox.ecubox_backend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lote_recepcion_guia")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LoteRecepcionGuia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "lote_recepcion_id", nullable = false)
    private LoteRecepcion loteRecepcion;

    @Column(name = "numero_guia_envio", nullable = false, length = 100)
    private String numeroGuiaEnvio;
}
