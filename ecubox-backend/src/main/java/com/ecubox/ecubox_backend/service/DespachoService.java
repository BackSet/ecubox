package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.AplicarEstadoPorPeriodoResponse;
import com.ecubox.ecubox_backend.dto.DespachoCreateRequest;
import com.ecubox.ecubox_backend.dto.DespachoDTO;
import com.ecubox.ecubox_backend.dto.EstadoRastreoDTO;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoGeneradoDTO;
import com.ecubox.ecubox_backend.dto.SacaDTO;
import com.ecubox.ecubox_backend.entity.*;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.enums.TipoEntrega;
import com.ecubox.ecubox_backend.repository.*;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DespachoService {

    private final DespachoRepository despachoRepository;
    private final DistribuidorRepository distribuidorRepository;
    private final DestinatarioFinalRepository destinatarioFinalRepository;
    private final AgenciaRepository agenciaRepository;
    private final SacaRepository sacaRepository;
    private final SacaService sacaService;
    private final CurrentUserService currentUserService;
    private final PaqueteService paqueteService;
    private final PaqueteRepository paqueteRepository;
    private final ParametroSistemaService parametroSistemaService;
    private final AgenciaDistribuidorService agenciaDistribuidorService;
    private final SacaEnDespachoValidator sacaEnDespachoValidator;
    private final EstadoRastreoService estadoRastreoService;
    private final GuiaMasterService guiaMasterService;
    private final DestinatarioVersionService destinatarioVersionService;
    private final AgenciaVersionService agenciaVersionService;
    private final AgenciaDistribuidorVersionService agenciaDistribuidorVersionService;

    public DespachoService(DespachoRepository despachoRepository,
                          DistribuidorRepository distribuidorRepository,
                          DestinatarioFinalRepository destinatarioFinalRepository,
                          AgenciaRepository agenciaRepository,
                          SacaRepository sacaRepository,
                          SacaService sacaService,
                          CurrentUserService currentUserService,
                          PaqueteService paqueteService,
                          PaqueteRepository paqueteRepository,
                          ParametroSistemaService parametroSistemaService,
                          AgenciaDistribuidorService agenciaDistribuidorService,
                          SacaEnDespachoValidator sacaEnDespachoValidator,
                          EstadoRastreoService estadoRastreoService,
                          GuiaMasterService guiaMasterService,
                          DestinatarioVersionService destinatarioVersionService,
                          AgenciaVersionService agenciaVersionService,
                          AgenciaDistribuidorVersionService agenciaDistribuidorVersionService) {
        this.despachoRepository = despachoRepository;
        this.distribuidorRepository = distribuidorRepository;
        this.destinatarioFinalRepository = destinatarioFinalRepository;
        this.agenciaRepository = agenciaRepository;
        this.sacaRepository = sacaRepository;
        this.sacaService = sacaService;
        this.currentUserService = currentUserService;
        this.paqueteService = paqueteService;
        this.paqueteRepository = paqueteRepository;
        this.sacaEnDespachoValidator = sacaEnDespachoValidator;
        this.parametroSistemaService = parametroSistemaService;
        this.agenciaDistribuidorService = agenciaDistribuidorService;
        this.estadoRastreoService = estadoRastreoService;
        this.guiaMasterService = guiaMasterService;
        this.destinatarioVersionService = destinatarioVersionService;
        this.agenciaVersionService = agenciaVersionService;
        this.agenciaDistribuidorVersionService = agenciaDistribuidorVersionService;
    }

    /**
     * Recalcula el estado agregado de las guias master a las que pertenecen
     * los paquetes indicados. Util cuando se cambia la asignacion saca-despacho
     * (que afecta {@code piezaDespachada} en {@link GuiaMasterService}).
     */
    private void recomputarGuiasMasterDePaquetes(List<Long> paqueteIds) {
        if (paqueteIds == null || paqueteIds.isEmpty()) return;
        List<Long> gmIds = paqueteRepository.findGuiaMasterIdsByPaqueteIds(paqueteIds);
        for (Long gmId : gmIds) {
            if (gmId != null) {
                guiaMasterService.recomputarEstado(gmId);
            }
        }
    }

    @Transactional(readOnly = true)
    public List<DespachoDTO> findAll() {
        return despachoRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .map(this::toDTO)
                .toList();
    }

    @Transactional
    public DespachoDTO create(DespachoCreateRequest request) {
        Distribuidor distribuidor = distribuidorRepository.findById(request.getDistribuidorId())
                .orElseThrow(() -> new ResourceNotFoundException("Distribuidor", request.getDistribuidorId()));
        EntregaResuelta entrega = resolveEntrega(request);

        List<Long> sacaIds = request.getSacaIds() != null ? request.getSacaIds() : new ArrayList<>();
        validarSacasParaTipoEntrega(request.getTipoEntrega(), sacaIds);

        Usuario operario = currentUserService.getCurrentUsuario();
        LocalDateTime fechaHora = request.getFechaHora() != null ? request.getFechaHora() : LocalDateTime.now();

        Despacho d = Despacho.builder()
                .numeroGuia(request.getNumeroGuia().trim())
                .observaciones(request.getObservaciones() != null ? request.getObservaciones().trim() : null)
                .codigoPrecinto(request.getCodigoPrecinto() != null ? request.getCodigoPrecinto().trim() : null)
                .operario(operario)
                .fechaHora(fechaHora)
                .distribuidor(distribuidor)
                .tipoEntrega(request.getTipoEntrega())
                .destinatarioFinal(entrega.destinatarioFinal())
                .agencia(entrega.agencia())
                .agenciaDistribuidor(entrega.agenciaDistribuidor())
                .build();
        // SCD2: el despacho congela su destino inmediatamente al crearse.
        // A partir de aqui los datos impresos en el despacho son inmutables
        // independientemente de ediciones posteriores en los maestros.
        congelarDestinoVersion(d);
        d = despachoRepository.save(d);

        if (!sacaIds.isEmpty()) {
            List<Saca> sacasACambiar = sacaRepository.findAllById(sacaIds);
            if (sacasACambiar.size() != sacaIds.size()) {
                Set<Long> encontradas = sacasACambiar.stream().map(Saca::getId).collect(Collectors.toSet());
                Long faltante = sacaIds.stream().filter(sid -> !encontradas.contains(sid)).findFirst().orElse(null);
                throw new ResourceNotFoundException("Saca", faltante);
            }
            for (Saca saca : sacasACambiar) {
                sacaEnDespachoValidator.requireSinDespacho(saca, null);
                saca.setDespacho(d);
            }
            sacaRepository.saveAll(sacasACambiar);
            List<Long> paqueteIds = paqueteRepository.findIdsBySacaIdIn(sacaIds);
            if (!paqueteIds.isEmpty()) {
                paqueteService.aplicarEstadoEnDespacho(paqueteIds);
            }
            d = despachoRepository.findById(d.getId()).orElse(d);
        }

        return toDTO(d);
    }

    @Transactional(readOnly = true)
    public DespachoDTO findById(Long id) {
        Despacho d = despachoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", id));
        DespachoDTO dto = toDTO(d);
        if (d.getSacas() != null && !d.getSacas().isEmpty()) {
            List<SacaDTO> sacaDTOs = d.getSacas().stream().map(sacaService::toDTO).toList();
            dto.setSacas(sacaDTOs);
        }
        return dto;
    }

    @Transactional
    public DespachoDTO update(Long id, DespachoCreateRequest request) {
        Despacho d = despachoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", id));

        Distribuidor distribuidor = distribuidorRepository.findById(request.getDistribuidorId())
                .orElseThrow(() -> new ResourceNotFoundException("Distribuidor", request.getDistribuidorId()));
        EntregaResuelta entrega = resolveEntrega(request);

        // SCD2: el destino del despacho es inmutable una vez creado. Si el
        // operario quiere cambiarlo debe anular este despacho y crear uno nuevo,
        // para que la trazabilidad refleje claramente el reenrutado.
        if (d.getDestinoCongeladoEn() != null) {
            validarDestinoNoCambia(d, request);
        }

        List<Long> requestedSacaIdsForValidation = request.getSacaIds() != null ? request.getSacaIds() : new ArrayList<>();
        validarSacasParaTipoEntrega(request.getTipoEntrega(), requestedSacaIdsForValidation);

        LocalDateTime fechaHora = request.getFechaHora() != null ? request.getFechaHora() : d.getFechaHora();

        d.setNumeroGuia(request.getNumeroGuia().trim());
        d.setObservaciones(request.getObservaciones() != null ? request.getObservaciones().trim() : null);
        d.setCodigoPrecinto(request.getCodigoPrecinto() != null ? request.getCodigoPrecinto().trim() : null);
        d.setFechaHora(fechaHora);
        d.setDistribuidor(distribuidor);
        d.setTipoEntrega(request.getTipoEntrega());
        d.setDestinatarioFinal(entrega.destinatarioFinal());
        d.setAgencia(entrega.agencia());
        d.setAgenciaDistribuidor(entrega.agenciaDistribuidor());
        despachoRepository.save(d);

        List<Long> requestedSacaIds = request.getSacaIds() != null ? request.getSacaIds() : new ArrayList<>();
        Set<Long> requestedSet = Set.copyOf(requestedSacaIds);

        List<Saca> currentSacas = d.getSacas() != null ? d.getSacas() : new ArrayList<>();
        List<Long> sacasDesasignadas = new ArrayList<>();
        for (Saca saca : currentSacas) {
            if (!requestedSet.contains(saca.getId())) {
                sacasDesasignadas.add(saca.getId());
                saca.setDespacho(null);
                sacaRepository.save(saca);
            }
        }
        if (!sacasDesasignadas.isEmpty()) {
            // Las piezas de estas sacas dejaron de estar asignadas a un despacho;
            // recalculamos el estado de sus guias master por si dejan de estar
            // en DESPACHO_PARCIAL.
            List<Long> paqueteIdsDesasignados = paqueteRepository.findIdsBySacaIdIn(sacasDesasignadas);
            recomputarGuiasMasterDePaquetes(paqueteIdsDesasignados);
        }

        List<Long> currentSacaIds = currentSacas.stream().map(Saca::getId).toList();
        Set<Long> currentSet = Set.copyOf(currentSacaIds);
        List<Long> nuevasSacaIds = new ArrayList<>();
        if (!requestedSacaIds.isEmpty()) {
            List<Saca> sacasReq = sacaRepository.findAllById(requestedSacaIds);
            if (sacasReq.size() != requestedSacaIds.size()) {
                Set<Long> encontradas = sacasReq.stream().map(Saca::getId).collect(Collectors.toSet());
                Long faltante = requestedSacaIds.stream().filter(sid -> !encontradas.contains(sid)).findFirst().orElse(null);
                throw new ResourceNotFoundException("Saca", faltante);
            }
            for (Saca saca : sacasReq) {
                sacaEnDespachoValidator.requireSinDespacho(saca, id);
                if (!currentSet.contains(saca.getId())) {
                    nuevasSacaIds.add(saca.getId());
                }
                saca.setDespacho(d);
            }
            sacaRepository.saveAll(sacasReq);
        }
        if (!nuevasSacaIds.isEmpty()) {
            List<Long> paqueteIdsToApply = paqueteRepository.findIdsBySacaIdIn(nuevasSacaIds);
            if (!paqueteIdsToApply.isEmpty()) {
                paqueteService.aplicarEstadoEnDespacho(paqueteIdsToApply);
            }
        }

        d = despachoRepository.findById(d.getId()).orElse(d);
        return toDTO(d);
    }

    @Transactional
    public void delete(Long id) {
        Despacho d = despachoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", id));
        List<Saca> sacas = d.getSacas() != null ? d.getSacas() : new ArrayList<>();
        List<Long> paqueteIdsAfectados = new ArrayList<>();
        if (!sacas.isEmpty()) {
            List<Long> sacaIds = sacas.stream().map(Saca::getId).toList();
            paqueteIdsAfectados = paqueteRepository.findIdsBySacaIdIn(sacaIds);
            if (!paqueteIdsAfectados.isEmpty()) {
                paqueteService.revertirEstadoSiUltimoEventoCoincide(paqueteIdsAfectados, "DESPACHO_AUTO");
            }
            for (Saca saca : sacas) {
                saca.setDespacho(null);
            }
            sacaRepository.saveAll(sacas);
        }
        despachoRepository.delete(d);
        // Las piezas dejaron de estar despachadas: hay que recalcular el estado
        // agregado de sus guias master (las que no esten congeladas/terminales).
        recomputarGuiasMasterDePaquetes(paqueteIdsAfectados);
    }

    @Transactional(readOnly = true)
    public MensajeWhatsAppDespachoGeneradoDTO getMensajeWhatsAppParaDespacho(Long id) {
        String plantilla = parametroSistemaService.getMensajeWhatsAppDespacho().getPlantilla();
        if (plantilla == null) {
            plantilla = "";
        }
        Despacho d = despachoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Despacho", id));

        List<Saca> sacas = sacaRepository.findByDespachoIdOrderByIdAsc(id);
        int cantidadSacas = sacas.size();
        long totalPaquetes = 0;
        List<String> numerosSacaList = new ArrayList<>();
        List<String> paquetesPorSacaList = new ArrayList<>();
        for (Saca saca : sacas) {
            long count = paqueteRepository.countBySacaId(saca.getId());
            totalPaquetes += count;
            numerosSacaList.add(saca.getNumeroOrden() != null ? saca.getNumeroOrden() : "");
            paquetesPorSacaList.add(String.valueOf(count));
        }
        String codigoPrecinto = d.getCodigoPrecinto() != null ? d.getCodigoPrecinto() : "";
        String cantidadSacasStr = String.valueOf(cantidadSacas);
        String totalPaquetesStr = String.valueOf(totalPaquetes);
        String numerosSaca = String.join(", ", numerosSacaList);
        String paquetesPorSaca = String.join(", ", paquetesPorSacaList);

        String numeroGuia = d.getNumeroGuia() != null ? d.getNumeroGuia() : "";
        String destinatarioNombre = d.getDestinatarioFinal() != null && d.getDestinatarioFinal().getNombre() != null
                ? d.getDestinatarioFinal().getNombre() : "";
        String distribuidorNombre = d.getDistribuidor() != null && d.getDistribuidor().getNombre() != null
                ? d.getDistribuidor().getNombre() : "";
        String agenciaNombre = d.getAgencia() != null && d.getAgencia().getNombre() != null
                ? d.getAgencia().getNombre() : "";
        if (d.getAgenciaDistribuidor() != null) {
            agenciaNombre = com.ecubox.ecubox_backend.service.AgenciaDistribuidorService.etiquetaDe(d.getAgenciaDistribuidor());
        }
        String observaciones = d.getObservaciones() != null ? d.getObservaciones() : "";

        String mensaje = plantilla
                .replace("{{numeroGuia}}", numeroGuia)
                .replace("{{destinatarioNombre}}", destinatarioNombre)
                .replace("{{distribuidorNombre}}", distribuidorNombre)
                .replace("{{agenciaNombre}}", agenciaNombre)
                .replace("{{observaciones}}", observaciones)
                .replace("{{codigoPrecinto}}", codigoPrecinto)
                .replace("{{cantidadSacas}}", cantidadSacasStr)
                .replace("{{totalPaquetes}}", totalPaquetesStr)
                .replace("{{numerosSaca}}", numerosSaca)
                .replace("{{paquetesPorSaca}}", paquetesPorSaca);

        return MensajeWhatsAppDespachoGeneradoDTO.builder()
                .mensaje(mensaje)
                .build();
    }

    @Transactional
    public AplicarEstadoPorPeriodoResponse aplicarEstadoRastreoPorPeriodo(LocalDate fechaInicio, LocalDate fechaFin, Long estadoRastreoIdOpcional) {
        Long estadoId = resolverEstadoIdPosteriorADespacho(estadoRastreoIdOpcional);
        LocalDateTime desde = fechaInicio.atStartOfDay();
        LocalDateTime hasta = fechaFin.atTime(LocalTime.MAX);
        List<Despacho> despachos = despachoRepository.findByFechaHoraBetweenOrderByFechaHoraAscIdAsc(desde, hasta);
        return aplicarEstadoEnDespachos(despachos, estadoId);
    }

    /**
     * Aplica el estado a todos los paquetes de los despachos indicados (uno o varios).
     * Si {@code estadoRastreoIdOpcional} es null se usa el estado "en tránsito" configurado.
     * El estado debe ser estrictamente posterior al "estado del punto de despacho".
     */
    @Transactional
    public AplicarEstadoPorPeriodoResponse aplicarEstadoRastreoEnDespachos(List<Long> despachoIds,
                                                                           Long estadoRastreoIdOpcional) {
        if (despachoIds == null || despachoIds.isEmpty()) {
            throw new BadRequestException("Debe indicar al menos un despacho");
        }
        Long estadoId = resolverEstadoIdPosteriorADespacho(estadoRastreoIdOpcional);
        List<Long> idsUnicos = despachoIds.stream().filter(java.util.Objects::nonNull).distinct().toList();
        List<Despacho> despachos = despachoRepository.findAllById(idsUnicos);
        if (despachos.size() != idsUnicos.size()) {
            Set<Long> encontrados = despachos.stream().map(Despacho::getId).collect(Collectors.toSet());
            Long faltante = idsUnicos.stream().filter(id -> !encontrados.contains(id)).findFirst().orElse(null);
            if (faltante != null) {
                throw new ResourceNotFoundException("Despacho", faltante);
            }
        }
        return aplicarEstadoEnDespachos(despachos, estadoId);
    }

    /**
     * Lista los estados de rastreo activos que el operario puede aplicar a los paquetes
     * de un despacho. Solo se incluyen estados estrictamente posteriores al "estado del
     * punto de despacho" configurado, ordenados por orden de tracking.
     */
    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> listarEstadosPosterioresADespacho() {
        Integer ordenDespacho = ordenEstadoEnDespachoOrThrow();
        return estadoRastreoService.findActivos().stream()
                .filter(e -> {
                    Integer orden = e.getOrden() != null ? e.getOrden() : e.getOrdenTracking();
                    return orden != null && orden > ordenDespacho;
                })
                .toList();
    }

    /**
     * Resuelve el estado a aplicar y valida que sea estrictamente posterior al
     * estado del punto de despacho (los paquetes ya están "en despacho" cuando se
     * abre este flujo, así que solo tiene sentido avanzarlos).
     */
    private Long resolverEstadoIdPosteriorADespacho(Long estadoRastreoIdOpcional) {
        Long estadoId = estadoRastreoIdOpcional != null
                ? estadoRastreoIdOpcional
                : parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnTransitoId();
        if (estadoId == null) {
            throw new BadRequestException(
                    "No hay un estado por defecto configurado para aplicar después del despacho. Configure 'En tránsito' en parámetros.");
        }
        Integer ordenDespacho = ordenEstadoEnDespachoOrThrow();
        Integer ordenObjetivo = estadoRastreoService.getOrdenById(estadoId);
        if (ordenObjetivo == null) {
            EstadoRastreo entidad = estadoRastreoService.findEntityById(estadoId);
            ordenObjetivo = entidad.getOrden() != null ? entidad.getOrden() : entidad.getOrdenTracking();
        }
        if (ordenObjetivo == null) {
            throw new BadRequestException("El estado seleccionado no tiene un orden de tracking definido");
        }
        if (ordenObjetivo <= ordenDespacho) {
            throw new BadRequestException(
                    "Solo se pueden aplicar estados posteriores al 'estado del punto de despacho'.");
        }
        return estadoId;
    }

    private Integer ordenEstadoEnDespachoOrThrow() {
        Long enDespachoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnDespachoId();
        if (enDespachoId == null) {
            throw new BadRequestException(
                    "No hay un 'estado del punto de despacho' configurado en parámetros del sistema.");
        }
        Integer orden = estadoRastreoService.getOrdenById(enDespachoId);
        if (orden == null) {
            EstadoRastreo entidad = estadoRastreoService.findEntityById(enDespachoId);
            orden = entidad.getOrden() != null ? entidad.getOrden() : entidad.getOrdenTracking();
        }
        if (orden == null) {
            throw new BadRequestException("El 'estado del punto de despacho' no tiene un orden de tracking definido");
        }
        return orden;
    }

    private AplicarEstadoPorPeriodoResponse aplicarEstadoEnDespachos(List<Despacho> despachos, Long estadoId) {
        if (despachos.isEmpty()) {
            return AplicarEstadoPorPeriodoResponse.builder().despachosProcesados(0).paquetesActualizados(0).build();
        }
        List<Long> despachoIds = despachos.stream().map(Despacho::getId).toList();
        List<Saca> sacas = sacaRepository.findByDespachoIdIn(despachoIds);
        List<Long> sacaIds = sacas.stream().map(Saca::getId).toList();
        List<Long> paqueteIds = sacaIds.isEmpty() ? List.of() : paqueteRepository.findIdsBySacaIdIn(sacaIds);
        paqueteService.aplicarEstadoRastreoMasivo(paqueteIds, estadoId);
        return AplicarEstadoPorPeriodoResponse.builder()
                .despachosProcesados(despachos.size())
                .paquetesActualizados(paqueteIds.size())
                .build();
    }

    private DespachoDTO toDTO(Despacho d) {
        List<Long> sacaIds = d.getSacas() != null
                ? d.getSacas().stream().map(Saca::getId).collect(Collectors.toList())
                : new ArrayList<>();

        // SCD2: si el despacho tiene snapshot de destino, ese es la fuente
        // de verdad para nombre/direccion/etc. Si no, leemos del maestro vivo.
        DestinatarioFinalVersion destSnap = d.getDestinatarioVersion();
        AgenciaVersion agSnap = d.getAgenciaVersion();
        AgenciaDistribuidorVersion adSnap = d.getAgenciaDistribuidorVersion();

        String destinatarioNombre;
        String destinatarioDireccion;
        String destinatarioTelefono;
        if (destSnap != null) {
            destinatarioNombre = destSnap.getNombre();
            destinatarioDireccion = destSnap.getDireccion();
            destinatarioTelefono = destSnap.getTelefono();
        } else {
            DestinatarioFinal df = d.getDestinatarioFinal();
            destinatarioNombre = df != null ? df.getNombre() : null;
            destinatarioDireccion = df != null ? df.getDireccion() : null;
            destinatarioTelefono = df != null ? df.getTelefono() : null;
        }

        String agenciaNombre;
        if (agSnap != null) {
            agenciaNombre = agSnap.getNombre();
        } else {
            agenciaNombre = d.getAgencia() != null ? d.getAgencia().getNombre() : null;
        }

        String agenciaDistribuidorNombre;
        if (adSnap != null) {
            agenciaDistribuidorNombre = etiquetaDeVersion(adSnap);
        } else if (d.getAgenciaDistribuidor() != null) {
            agenciaDistribuidorNombre = com.ecubox.ecubox_backend.service.AgenciaDistribuidorService.etiquetaDe(d.getAgenciaDistribuidor());
        } else {
            agenciaDistribuidorNombre = null;
        }

        return DespachoDTO.builder()
                .id(d.getId())
                .numeroGuia(d.getNumeroGuia())
                .observaciones(d.getObservaciones())
                .codigoPrecinto(d.getCodigoPrecinto())
                .operarioId(d.getOperario() != null ? d.getOperario().getId() : null)
                .operarioNombre(d.getOperario() != null ? d.getOperario().getUsername() : null)
                .fechaHora(d.getFechaHora())
                .distribuidorId(d.getDistribuidor() != null ? d.getDistribuidor().getId() : null)
                .distribuidorNombre(d.getDistribuidor() != null ? d.getDistribuidor().getNombre() : null)
                .tipoEntrega(d.getTipoEntrega())
                .destinatarioFinalId(d.getDestinatarioFinal() != null ? d.getDestinatarioFinal().getId() : null)
                .destinatarioNombre(destinatarioNombre)
                .destinatarioDireccion(destinatarioDireccion)
                .destinatarioTelefono(destinatarioTelefono)
                .agenciaId(d.getAgencia() != null ? d.getAgencia().getId() : null)
                .agenciaNombre(agenciaNombre)
                .agenciaDistribuidorId(d.getAgenciaDistribuidor() != null ? d.getAgenciaDistribuidor().getId() : null)
                .agenciaDistribuidorNombre(agenciaDistribuidorNombre)
                .destinatarioVersionId(destSnap != null ? destSnap.getId() : null)
                .agenciaVersionId(agSnap != null ? agSnap.getId() : null)
                .agenciaDistribuidorVersionId(adSnap != null ? adSnap.getId() : null)
                .destinoCongeladoEn(d.getDestinoCongeladoEn())
                .sacaIds(sacaIds)
                .build();
    }

    /**
     * Reconstruye la etiqueta "Provincia, Canton (CODIGO)" desde un snapshot
     * inmutable de agencia de distribuidor. Mantiene la misma forma que
     * {@link AgenciaDistribuidorService#etiquetaDe} para consistencia visual.
     */
    private static String etiquetaDeVersion(AgenciaDistribuidorVersion a) {
        if (a == null) return "";
        String prov = a.getProvincia() != null ? a.getProvincia().trim() : "";
        String cant = a.getCanton() != null ? a.getCanton().trim() : "";
        String cod = a.getCodigo() != null ? a.getCodigo().trim() : "";
        List<String> parts = new ArrayList<>();
        if (!prov.isEmpty()) parts.add(prov);
        if (!cant.isEmpty()) parts.add(cant);
        String loc = String.join(", ", parts);
        if (!loc.isEmpty()) {
            return cod.isEmpty() ? loc : loc + " (" + cod + ")";
        }
        return cod.isEmpty() ? "—" : cod;
    }

    /**
     * Resuelve y setea las versiones vigentes del destino segun
     * {@link Despacho#getTipoEntrega()}. Idempotente: si el despacho ya
     * tiene {@code destinoCongeladoEn}, no hace nada.
     */
    private void congelarDestinoVersion(Despacho d) {
        if (d == null) return;
        if (d.getDestinoCongeladoEn() != null) return;
        boolean alguno = false;
        if (d.getDestinatarioFinal() != null) {
            DestinatarioFinal df = d.getDestinatarioFinal();
            DestinatarioFinalVersion v = destinatarioVersionService.getVersionVigente(df.getId())
                    .orElseGet(() -> destinatarioVersionService.crearNuevaVersion(df, null));
            d.setDestinatarioVersion(v);
            alguno = true;
        }
        if (d.getAgencia() != null) {
            Agencia ag = d.getAgencia();
            AgenciaVersion v = agenciaVersionService.getVersionVigente(ag.getId())
                    .orElseGet(() -> agenciaVersionService.crearNuevaVersion(ag, null));
            d.setAgenciaVersion(v);
            alguno = true;
        }
        if (d.getAgenciaDistribuidor() != null) {
            AgenciaDistribuidor ad = d.getAgenciaDistribuidor();
            AgenciaDistribuidorVersion v = agenciaDistribuidorVersionService.getVersionVigente(ad.getId())
                    .orElseGet(() -> agenciaDistribuidorVersionService.crearNuevaVersion(ad, null));
            d.setAgenciaDistribuidorVersion(v);
            alguno = true;
        }
        if (alguno) {
            d.setDestinoCongeladoEn(LocalDateTime.now());
        }
    }

    /**
     * Verifica que el request no intente cambiar el destino congelado.
     * Permite editar otros campos (numero, observaciones, fechaHora, sacas)
     * pero no el destinatario, agencia, agencia de distribuidor ni el
     * tipo de entrega.
     */
    private void validarDestinoNoCambia(Despacho d, DespachoCreateRequest request) {
        if (request.getTipoEntrega() != null && d.getTipoEntrega() != request.getTipoEntrega()) {
            throw new BadRequestException(
                    "El tipo de entrega de un despacho ya creado no se puede cambiar (esta congelado para trazabilidad).");
        }
        Long destActual = d.getDestinatarioFinal() != null ? d.getDestinatarioFinal().getId() : null;
        if (!java.util.Objects.equals(destActual, request.getDestinatarioFinalId())) {
            throw new BadRequestException(
                    "El destinatario del despacho esta congelado y no se puede cambiar. "
                            + "Anula este despacho y crea uno nuevo si necesitas reenrutar el envio.");
        }
        Long agActual = d.getAgencia() != null ? d.getAgencia().getId() : null;
        if (!java.util.Objects.equals(agActual, request.getAgenciaId())) {
            throw new BadRequestException(
                    "La agencia destino del despacho esta congelada y no se puede cambiar.");
        }
        Long adActual = d.getAgenciaDistribuidor() != null ? d.getAgenciaDistribuidor().getId() : null;
        if (!java.util.Objects.equals(adActual, request.getAgenciaDistribuidorId())) {
            throw new BadRequestException(
                    "La agencia de distribuidor destino del despacho esta congelada y no se puede cambiar.");
        }
    }

    /**
     * Para tipo AGENCIA_DISTRIBUIDOR (y DOMICILIO): todos los paquetes de las sacas deben tener el mismo destinatario final.
     */
    private void validarSacasParaTipoEntrega(TipoEntrega tipoEntrega, List<Long> sacaIds) {
        if (tipoEntrega == TipoEntrega.AGENCIA_DISTRIBUIDOR && !sacaIds.isEmpty()) {
            validarMismoDestinatarioEnSacas(sacaIds);
        }
    }

    private EntregaResuelta resolveEntrega(DespachoCreateRequest request) {
        DestinatarioFinal destinatarioFinal = null;
        Agencia agencia = null;
        AgenciaDistribuidor agenciaDistribuidor = null;

        if (request.getTipoEntrega() == TipoEntrega.DOMICILIO) {
            if (request.getDestinatarioFinalId() == null) {
                throw new BadRequestException("Domicilio requiere destinatario final");
            }
            destinatarioFinal = destinatarioFinalRepository.findById(request.getDestinatarioFinalId())
                    .orElseThrow(() -> new ResourceNotFoundException("Destinatario", request.getDestinatarioFinalId()));
        } else if (request.getTipoEntrega() == TipoEntrega.AGENCIA) {
            if (request.getAgenciaId() == null) {
                throw new BadRequestException("Agencia requiere agencia seleccionada");
            }
            agencia = agenciaRepository.findById(request.getAgenciaId())
                    .orElseThrow(() -> new ResourceNotFoundException("Agencia", request.getAgenciaId()));
        } else if (request.getTipoEntrega() == TipoEntrega.AGENCIA_DISTRIBUIDOR) {
            if (request.getAgenciaDistribuidorId() == null) {
                throw new BadRequestException("Agencia de distribuidor requiere agencia del distribuidor seleccionada");
            }
            agenciaDistribuidor = agenciaDistribuidorService.findEntityById(request.getAgenciaDistribuidorId());
        }

        return new EntregaResuelta(destinatarioFinal, agencia, agenciaDistribuidor);
    }

    private record EntregaResuelta(
            DestinatarioFinal destinatarioFinal,
            Agencia agencia,
            AgenciaDistribuidor agenciaDistribuidor
    ) {}

    private void validarMismoDestinatarioEnSacas(List<Long> sacaIds) {
        Long refDestinatarioId = null;
        for (Long sacaId : sacaIds) {
            List<Paquete> paquetes = paqueteRepository.findBySacaId(sacaId);
            for (Paquete p : paquetes) {
                Long destId = p.getDestinatarioFinal() != null ? p.getDestinatarioFinal().getId() : null;
                if (refDestinatarioId == null) {
                    refDestinatarioId = destId;
                } else if (!java.util.Objects.equals(refDestinatarioId, destId)) {
                    throw new BadRequestException("En despacho a agencia de distribuidor todos los paquetes deben tener el mismo destinatario. Revise los paquetes seleccionados.");
                }
            }
        }
    }
}
