package com.ecubox.ecubox_backend.service.validation;

import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.EstadoRevisionPaquete;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.repository.RevisionPaqueteRepository;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class PaqueteOperacionValidator {

    private final RevisionPaqueteRepository revisionPaqueteRepository;

    public PaqueteOperacionValidator(RevisionPaqueteRepository revisionPaqueteRepository) {
        this.revisionPaqueteRepository = revisionPaqueteRepository;
    }

    public void requireOperativo(Paquete paquete) {
        if (paquete != null && paquete.getId() != null) {
            requireOperativo(paquete.getId(), paquete.getNumeroGuia());
        }
    }

    public void requireOperativos(Collection<Paquete> paquetes) {
        if (revisionPaqueteRepository == null || paquetes == null || paquetes.isEmpty()) return;
        Set<Long> ids = paquetes.stream().map(Paquete::getId).collect(java.util.stream.Collectors.toSet());
        Set<Long> revisados = new HashSet<>(revisionPaqueteRepository.findPaqueteIdsByEstado(
                ids, EstadoRevisionPaquete.EN_REVISION));
        paquetes.stream()
                .filter(p -> revisados.contains(p.getId()))
                .findFirst()
                .ifPresent(this::throwEnRevision);
    }

    public boolean todosOperativos(Collection<Paquete> paquetes) {
        if (revisionPaqueteRepository == null || paquetes == null || paquetes.isEmpty()) return true;
        List<Long> ids = paquetes.stream().map(Paquete::getId).toList();
        return revisionPaqueteRepository.findPaqueteIdsByEstado(
                ids, EstadoRevisionPaquete.EN_REVISION).isEmpty();
    }

    public List<Paquete> filtrarOperativos(Collection<Paquete> paquetes) {
        if (paquetes == null || paquetes.isEmpty()) return List.of();
        List<Paquete> lista = List.copyOf(paquetes);
        if (revisionPaqueteRepository == null) return lista;
        Set<Long> revisados = new HashSet<>(revisionPaqueteRepository.findPaqueteIdsByEstado(
                lista.stream().map(Paquete::getId).toList(), EstadoRevisionPaquete.EN_REVISION));
        return lista.stream().filter(p -> !revisados.contains(p.getId())).toList();
    }

    public boolean estaEnRevision(Long paqueteId) {
        return revisionPaqueteRepository != null && revisionPaqueteRepository.existsByPaqueteIdAndEstado(
                paqueteId, EstadoRevisionPaquete.EN_REVISION);
    }

    private void requireOperativo(Long paqueteId, String numeroGuia) {
        if (estaEnRevision(paqueteId)) {
            throwEnRevision(Paquete.builder().id(paqueteId).numeroGuia(numeroGuia).build());
        }
    }

    private void throwEnRevision(Paquete paquete) {
        String referencia = paquete.getNumeroGuia() != null
                ? paquete.getNumeroGuia()
                : String.valueOf(paquete.getId());
        throw new ConflictException(
                "El paquete " + referencia + " tiene una revisión administrativa activa. "
                        + "Mientras esté en revisión solo se permite consultar, corregir sus datos "
                        + "o resolver la revisión.");
    }
}
