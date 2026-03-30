package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.EstadoRastreoAlternoAfterItemRequest;
import com.ecubox.ecubox_backend.dto.EstadoRastreoRequest;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import jakarta.persistence.EntityManager;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EstadoRastreoService {

    private final EstadoRastreoRepository estadoRastreoRepository;
    private final PaqueteRepository paqueteRepository;
    private final EntityManager entityManager;

    public EstadoRastreoService(EstadoRastreoRepository estadoRastreoRepository,
                                PaqueteRepository paqueteRepository,
                                EntityManager entityManager) {
        this.estadoRastreoRepository = estadoRastreoRepository;
        this.paqueteRepository = paqueteRepository;
        this.entityManager = entityManager;
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> findAll() {
        return estadoRastreoRepository.findAllByOrderByOrdenTrackingAscIdAsc().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> findActivos() {
        return estadoRastreoRepository.findByActivoTrueOrderByOrdenTrackingAscIdAsc().stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<EstadoRastreo> findActivosEntities() {
        return estadoRastreoRepository.findByActivoTrueOrderByOrdenTrackingAscIdAsc();
    }

    /** Estados activos ordenados por tracking, excluyendo el origen (para cambio de estado masivo). */
    @Transactional(readOnly = true)
    public List<EstadoRastreo> findDestinosActivosExcluyendoOrigen(Long estadoOrigenId) {
        return findActivosEntities().stream()
                .filter(e -> estadoOrigenId == null || !e.getId().equals(estadoOrigenId))
                .toList();
    }

    @Transactional(readOnly = true)
    public EstadoRastreoDTO findById(Long id) {
        EstadoRastreo e = estadoRastreoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estado de rastreo", id));
        return toDTO(e);
    }

    @Transactional(readOnly = true)
    public EstadoRastreo findEntityById(Long id) {
        return estadoRastreoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estado de rastreo", id));
    }

    @Transactional(readOnly = true)
    public EstadoRastreo findEntityByCodigo(String codigo) {
        return estadoRastreoRepository.findByCodigo(codigo)
                .orElseThrow(() -> new ResourceNotFoundException("Estado de rastreo con código", codigo));
    }

    @Transactional
    public EstadoRastreoDTO create(EstadoRastreoRequest request) {
        String codigo = request.getCodigo() != null ? request.getCodigo().trim().toUpperCase() : "";
        if (estadoRastreoRepository.existsByCodigo(codigo)) {
            throw new BadRequestException("Ya existe un estado de rastreo con el código " + codigo);
        }
        EstadoRastreo e = toEntity(request);
        e.setCodigo(codigo);
        if (request.getOrdenTracking() == null) {
            e.setOrdenTracking(estadoRastreoRepository.findMaxOrdenTracking() + 1);
        }
        e.setOrden(e.getOrdenTracking());
        e.setAfterEstado(resolveAfterEstado(request.getAfterEstadoId(), e.getTipoFlujo(), null));
        e = estadoRastreoRepository.save(e);
        return toDTO(e);
    }

    @Transactional
    public EstadoRastreoDTO update(Long id, EstadoRastreoRequest request) {
        EstadoRastreo e = estadoRastreoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estado de rastreo", id));
        String codigo = request.getCodigo() != null ? request.getCodigo().trim().toUpperCase() : "";
        if (estadoRastreoRepository.existsByCodigoAndIdNot(codigo, id)) {
            throw new BadRequestException("Ya existe otro estado de rastreo con el código " + codigo);
        }
        e.setCodigo(codigo);
        e.setNombre(request.getNombre() != null ? request.getNombre().trim() : e.getNombre());
        e.setOrdenTracking(request.getOrdenTracking() != null ? request.getOrdenTracking() : e.getOrdenTracking());
        e.setOrden(e.getOrdenTracking());
        if (request.getActivo() != null) {
            e.setActivo(request.getActivo());
        }
        e.setLeyenda(request.getLeyenda() != null ? request.getLeyenda().trim() : null);
        e.setTipoFlujo(request.getTipoFlujo() != null ? request.getTipoFlujo() : TipoFlujoEstado.NORMAL);
        e.setAfterEstado(resolveAfterEstado(request.getAfterEstadoId(), e.getTipoFlujo(), e.getId()));
        e.setPublicoTracking(request.getPublicoTracking() != null ? request.getPublicoTracking() : true);
        e = estadoRastreoRepository.save(e);
        return toDTO(e);
    }

    /** Desactiva el estado. No se elimina si hay paquetes usándolo. */
    @Transactional
    public EstadoRastreoDTO desactivar(Long id) {
        EstadoRastreo e = estadoRastreoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estado de rastreo", id));
        e.setActivo(false);
        e = estadoRastreoRepository.save(e);
        return toDTO(e);
    }

    /** Elimina solo si ningún paquete usa este estado. */
    @Transactional
    public void delete(Long id) {
        EstadoRastreo e = estadoRastreoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Estado de rastreo", id));
        long count = paqueteRepository.countByEstadoRastreoId(id);
        if (count > 0) {
            throw new BadRequestException("No se puede eliminar: hay " + count + " paquete(s) con este estado. Desactívelo en su lugar.");
        }
        estadoRastreoRepository.delete(e);
    }

    @Transactional
    public List<EstadoRastreoDTO> reorderTracking(List<Long> orderedBaseIds, List<EstadoRastreoAlternoAfterItemRequest> alternosAfter) {
        List<EstadoRastreo> activos = estadoRastreoRepository.findByActivoTrueOrderByOrdenTrackingAscIdAsc();
        if (orderedBaseIds == null || orderedBaseIds.isEmpty()) {
            throw new BadRequestException("Debe enviar la lista completa de estados base");
        }

        List<EstadoRastreo> baseStates = activos.stream()
                .filter(e -> e.getTipoFlujo() != TipoFlujoEstado.ALTERNO)
                .toList();
        List<EstadoRastreo> alternoStates = activos.stream()
                .filter(e -> e.getTipoFlujo() == TipoFlujoEstado.ALTERNO)
                .toList();
        if (orderedBaseIds.size() != baseStates.size()) {
            throw new BadRequestException("La lista enviada no coincide con la cantidad de estados base activos");
        }

        Set<Long> idsBase = baseStates.stream().map(EstadoRastreo::getId).collect(Collectors.toSet());
        Set<Long> idsRecibidos = new HashSet<>();
        for (Long id : orderedBaseIds) {
            if (!idsRecibidos.add(id)) {
                throw new BadRequestException("La lista contiene IDs repetidos: " + id);
            }
            if (!idsBase.contains(id)) {
                throw new BadRequestException("El estado base " + id + " no existe o no está activo");
            }
        }
        if (!idsRecibidos.equals(idsBase)) {
            throw new BadRequestException("La lista enviada debe incluir todos los estados base activos sin faltar ninguno");
        }

        Map<Long, EstadoRastreo> byId = activos.stream().collect(Collectors.toMap(EstadoRastreo::getId, e -> e));
        List<EstadoRastreoAlternoAfterItemRequest> alternosAfterSafe = alternosAfter != null ? alternosAfter : List.of();
        if (alternosAfterSafe.size() != alternoStates.size()) {
            throw new BadRequestException("Debe configurar la posición 'después de' para todos los estados alternos activos");
        }

        Set<Long> idsAlternos = alternoStates.stream().map(EstadoRastreo::getId).collect(Collectors.toSet());
        Set<Long> alternosVistos = new HashSet<>();
        Map<Long, List<Long>> alternosPorBase = new LinkedHashMap<>();
        for (Long baseId : orderedBaseIds) {
            alternosPorBase.put(baseId, new java.util.ArrayList<>());
        }
        for (EstadoRastreoAlternoAfterItemRequest item : alternosAfterSafe) {
            Long alternoId = item.getEstadoId();
            Long afterId = item.getAfterEstadoId();
            if (!idsAlternos.contains(alternoId)) {
                throw new BadRequestException("El estado " + alternoId + " no es alterno activo");
            }
            if (!alternosVistos.add(alternoId)) {
                throw new BadRequestException("Estado alterno repetido en configuración: " + alternoId);
            }
            if (!idsBase.contains(afterId)) {
                throw new BadRequestException("afterEstadoId inválido para alterno " + alternoId + ": " + afterId);
            }
            alternosPorBase.get(afterId).add(alternoId);
        }
        if (!alternosVistos.equals(idsAlternos)) {
            throw new BadRequestException("Faltan estados alternos por configurar con 'después de'");
        }

        List<EstadoRastreo> orderedFinal = new java.util.ArrayList<>();
        for (Long baseId : orderedBaseIds) {
            EstadoRastreo base = byId.get(baseId);
            orderedFinal.add(base);
            List<Long> alternosIds = alternosPorBase.getOrDefault(baseId, List.of());
            for (Long alternoId : alternosIds) {
                EstadoRastreo alterno = byId.get(alternoId);
                alterno.setAfterEstado(base);
                orderedFinal.add(alterno);
            }
        }

        // Fase 1: valores temporales únicos para evitar violar uk_estado_rastreo_orden_tracking_activo
        // al intercambiar posiciones (dos UPDATEs con el mismo orden_tracking intermedio).
        for (EstadoRastreo e : activos) {
            int tmp = -e.getId().intValue();
            e.setOrdenTracking(tmp);
            e.setOrden(tmp);
        }
        estadoRastreoRepository.saveAll(activos);
        entityManager.flush();

        int pos = 1;
        for (EstadoRastreo estado : orderedFinal) {
            estado.setOrdenTracking(pos);
            estado.setOrden(pos);
            pos++;
        }

        return estadoRastreoRepository.saveAll(activos).stream()
                .sorted(java.util.Comparator.comparing(EstadoRastreo::getOrdenTracking).thenComparing(EstadoRastreo::getId))
                .map(this::toDTO)
                .toList();
    }

    private EstadoRastreo toEntity(EstadoRastreoRequest r) {
        Integer ordenTracking = r.getOrdenTracking() != null
                ? r.getOrdenTracking()
                : (r.getOrden() != null ? r.getOrden() : 0);
        return EstadoRastreo.builder()
                .codigo(r.getCodigo() != null ? r.getCodigo().trim().toUpperCase() : null)
                .nombre(r.getNombre() != null ? r.getNombre().trim() : null)
                .orden(ordenTracking)
                .ordenTracking(ordenTracking)
                .activo(r.getActivo() != null ? r.getActivo() : true)
                .leyenda(r.getLeyenda() != null ? r.getLeyenda().trim() : null)
                .tipoFlujo(r.getTipoFlujo() != null ? r.getTipoFlujo() : TipoFlujoEstado.NORMAL)
                .publicoTracking(r.getPublicoTracking() != null ? r.getPublicoTracking() : true)
                .build();
    }

    private EstadoRastreoDTO toDTO(EstadoRastreo e) {
        return EstadoRastreoDTO.builder()
                .id(e.getId())
                .codigo(e.getCodigo())
                .nombre(e.getNombre())
                .orden(e.getOrden())
                .ordenTracking(e.getOrdenTracking())
                .afterEstadoId(e.getAfterEstado() != null ? e.getAfterEstado().getId() : null)
                .activo(e.getActivo())
                .leyenda(e.getLeyenda())
                .tipoFlujo(e.getTipoFlujo())
                .publicoTracking(e.getPublicoTracking())
                .build();
    }

    private EstadoRastreo resolveAfterEstado(Long afterEstadoId, TipoFlujoEstado tipoFlujo, Long currentEstadoId) {
        if (tipoFlujo != TipoFlujoEstado.ALTERNO) {
            return null;
        }
        if (afterEstadoId == null) {
            return null;
        }
        if (currentEstadoId != null && currentEstadoId.equals(afterEstadoId)) {
            throw new BadRequestException("Un estado alterno no puede apuntarse a sí mismo en 'después de'");
        }
        EstadoRastreo afterEstado = findEntityById(afterEstadoId);
        if (afterEstado.getTipoFlujo() == TipoFlujoEstado.ALTERNO) {
            throw new BadRequestException("Un estado alterno solo puede ubicarse después de un estado base");
        }
        return afterEstado;
    }
}
