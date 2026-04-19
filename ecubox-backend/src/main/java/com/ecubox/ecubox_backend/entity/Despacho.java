package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.TipoEntrega;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "despacho")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Despacho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_guia", nullable = false, length = 100)
    private String numeroGuia;

    @Column(columnDefinition = "TEXT")
    private String observaciones;

    @Column(name = "codigo_precinto", length = 100)
    private String codigoPrecinto;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "operario_id")
    private Usuario operario;

    @Column(name = "fecha_hora")
    private LocalDateTime fechaHora;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "distribuidor_id", nullable = false)
    private Distribuidor distribuidor;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_entrega", nullable = false, length = 50)
    private TipoEntrega tipoEntrega;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destinatario_final_id")
    private DestinatarioFinal destinatarioFinal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agencia_id")
    private Agencia agencia;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agencia_distribuidor_id")
    private AgenciaDistribuidor agenciaDistribuidor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manifiesto_id")
    private Manifiesto manifiesto;

    @OneToMany(mappedBy = "despacho", fetch = FetchType.LAZY, cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<Saca> sacas = new ArrayList<>();

    // ---------------------------------------------------------------------
    // Snapshot del destino congelado (V67 - SCD Tipo 2)
    //
    // Solo una de las tres referencias *_version es NOT NULL al mismo
    // tiempo, segun {@link #tipoEntrega}. Mientras todas sean NULL las
    // lecturas resuelven al maestro vivo (caso muy temprano: durante la
    // misma transaccion de creacion del despacho); en cuanto se completa
    // create() el snapshot esta poblado y es la fuente de verdad.
    // ---------------------------------------------------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destinatario_version_id")
    private DestinatarioFinalVersion destinatarioVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agencia_version_id")
    private AgenciaVersion agenciaVersion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agencia_distribuidor_version_id")
    private AgenciaDistribuidorVersion agenciaDistribuidorVersion;

    @Column(name = "destino_congelado_en")
    private LocalDateTime destinoCongeladoEn;

    @Version
    @Column(nullable = false)
    private Long version;
}
