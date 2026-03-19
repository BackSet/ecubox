package com.ecubox.ecubox_backend.entity;

import com.ecubox.ecubox_backend.enums.TamanioSaca;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "saca")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Saca {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "numero_orden", nullable = false, unique = true, length = 100)
    private String numeroOrden;

    @Column(name = "peso_lbs", precision = 12, scale = 4)
    private BigDecimal pesoLbs;

    @Column(name = "peso_kg", precision = 12, scale = 4)
    private BigDecimal pesoKg;

    @Enumerated(EnumType.STRING)
    @Column(length = 50)
    private TamanioSaca tamanio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "despacho_id")
    private Despacho despacho;

    @OneToMany(mappedBy = "saca", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Paquete> paquetes = new ArrayList<>();
}
