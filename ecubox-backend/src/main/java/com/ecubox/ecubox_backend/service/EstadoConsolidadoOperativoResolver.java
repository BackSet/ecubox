package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.EnvioConsolidado;
import com.ecubox.ecubox_backend.entity.LoteRecepcionGuia;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.EstadoEnvioConsolidadoOperativo;
import com.ecubox.ecubox_backend.enums.EstadoPagoConsolidado;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.util.Strings;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Component;

/**
 * Calcula el estado operativo derivado de un envío consolidado y expone
 * especificaciones JPA para filtrar listados por ese estado.
 */
@Component
public class EstadoConsolidadoOperativoResolver {

    private final LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;

    public EstadoConsolidadoOperativoResolver(LoteRecepcionGuiaRepository loteRecepcionGuiaRepository) {
        this.loteRecepcionGuiaRepository = loteRecepcionGuiaRepository;
    }

    public EstadoEnvioConsolidadoOperativo resolve(EnvioConsolidado envio, long totalPaquetes) {
        if (envio == null) {
            return EstadoEnvioConsolidadoOperativo.VACIO;
        }
        if (envio.getEstadoPago() == EstadoPagoConsolidado.PAGADO) {
            return EstadoEnvioConsolidadoOperativo.LIQUIDADO;
        }
        String codigo = Strings.trimOrNull(envio.getCodigo());
        if (codigo != null && loteRecepcionGuiaRepository.existsByNumeroGuiaEnvioIgnoreCase(codigo)) {
            return EstadoEnvioConsolidadoOperativo.RECIBIDO_EN_BODEGA;
        }
        if (envio.isCerrado()) {
            return EstadoEnvioConsolidadoOperativo.ENVIADO_DESDE_USA;
        }
        if (totalPaquetes <= 0) {
            return EstadoEnvioConsolidadoOperativo.VACIO;
        }
        return EstadoEnvioConsolidadoOperativo.EN_PREPARACION;
    }

    public Specification<EnvioConsolidado> specificationFor(EstadoEnvioConsolidadoOperativo estado) {
        return switch (estado) {
            case LIQUIDADO -> (root, query, cb) ->
                    cb.equal(root.get("estadoPago"), EstadoPagoConsolidado.PAGADO);
            case RECIBIDO_EN_BODEGA -> notLiquidado().and(enLoteRecepcion());
            case ENVIADO_DESDE_USA -> notLiquidado()
                    .and((root, query, cb) -> cb.isNotNull(root.get("fechaCerrado")))
                    .and(notEnLoteRecepcion());
            case EN_PREPARACION -> notLiquidado()
                    .and(conPaquetes())
                    .and((root, query, cb) -> cb.isNull(root.get("fechaCerrado")))
                    .and(notEnLoteRecepcion());
            case VACIO -> notLiquidado().and(sinPaquetes());
        };
    }

    private Specification<EnvioConsolidado> notLiquidado() {
        return (root, query, cb) -> cb.notEqual(root.get("estadoPago"), EstadoPagoConsolidado.PAGADO);
    }

    private Specification<EnvioConsolidado> enLoteRecepcion() {
        return (root, query, cb) -> cb.exists(subqueryCodigoEnLote(root, query, cb));
    }

    private Specification<EnvioConsolidado> notEnLoteRecepcion() {
        return (root, query, cb) -> cb.not(cb.exists(subqueryCodigoEnLote(root, query, cb)));
    }

    private Subquery<Integer> subqueryCodigoEnLote(Root<EnvioConsolidado> root,
                                                   jakarta.persistence.criteria.CriteriaQuery<?> query,
                                                   jakarta.persistence.criteria.CriteriaBuilder cb) {
        Subquery<Integer> sq = query.subquery(Integer.class);
        Root<LoteRecepcionGuia> g = sq.from(LoteRecepcionGuia.class);
        sq.select(cb.literal(1));
        Predicate match = cb.equal(
                cb.lower(cb.trim(g.get("numeroGuiaEnvio"))),
                cb.lower(cb.trim(root.get("codigo"))));
        sq.where(match);
        return sq;
    }

    private Specification<EnvioConsolidado> sinPaquetes() {
        return (root, query, cb) -> cb.not(cb.exists(subqueryPaqueteAsociado(root, query, cb)));
    }

    private Specification<EnvioConsolidado> conPaquetes() {
        return (root, query, cb) -> cb.exists(subqueryPaqueteAsociado(root, query, cb));
    }

    private Subquery<Integer> subqueryPaqueteAsociado(Root<EnvioConsolidado> root,
                                                      jakarta.persistence.criteria.CriteriaQuery<?> query,
                                                      jakarta.persistence.criteria.CriteriaBuilder cb) {
        Subquery<Integer> sq = query.subquery(Integer.class);
        Root<Paquete> p = sq.from(Paquete.class);
        sq.select(cb.literal(1));
        sq.where(cb.equal(p.get("envioConsolidado"), root));
        return sq;
    }
}
