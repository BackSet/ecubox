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
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.repository.*;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import com.ecubox.ecubox_backend.util.SearchSpecifications;
import com.ecubox.ecubox_backend.util.WeightUtil;
import com.ecubox.ecubox_backend.util.Pageables;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class DespachoService {

    private static final DateTimeFormatter FMT_FECHA_DESPACHO =
            DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final DespachoRepository despachoRepository;
    private final CourierEntregaRepository courierEntregaRepository;
    private final ConsignatarioRepository consignatarioRepository;
    private final AgenciaRepository agenciaRepository;
    private final SacaRepository sacaRepository;
    private final SacaService sacaService;
    private final CurrentUserService currentUserService;
    private final PaqueteService paqueteService;
    private final PaqueteRepository paqueteRepository;
    private final ParametroSistemaService parametroSistemaService;
    private final AgenciaCourierEntregaService agenciaCourierEntregaService;
    private final SacaEnDespachoValidator sacaEnDespachoValidator;
    private final EstadoRastreoService estadoRastreoService;
    private final GuiaMasterService guiaMasterService;
    private final ConsignatarioVersionService consignatarioVersionService;
    private final AgenciaVersionService agenciaVersionService;
    private final AgenciaCourierEntregaVersionService agenciaCourierEntregaVersionService;
    private final CodigoSecuenciaService codigoSecuenciaService;

    public DespachoService(DespachoRepository despachoRepository,
                          CourierEntregaRepository courierEntregaRepository,
                          ConsignatarioRepository consignatarioRepository,
                          AgenciaRepository agenciaRepository,
                          SacaRepository sacaRepository,
                          SacaService sacaService,
                          CurrentUserService currentUserService,
                          PaqueteService paqueteService,
                          PaqueteRepository paqueteRepository,
                          ParametroSistemaService parametroSistemaService,
                          AgenciaCourierEntregaService agenciaCourierEntregaService,
                          SacaEnDespachoValidator sacaEnDespachoValidator,
                          EstadoRastreoService estadoRastreoService,
                          GuiaMasterService guiaMasterService,
                          ConsignatarioVersionService consignatarioVersionService,
                          AgenciaVersionService agenciaVersionService,
                          AgenciaCourierEntregaVersionService agenciaCourierEntregaVersionService,
                          CodigoSecuenciaService codigoSecuenciaService) {
        this.despachoRepository = despachoRepository;
        this.courierEntregaRepository = courierEntregaRepository;
        this.consignatarioRepository = consignatarioRepository;
        this.agenciaRepository = agenciaRepository;
        this.sacaRepository = sacaRepository;
        this.sacaService = sacaService;
        this.currentUserService = currentUserService;
        this.paqueteService = paqueteService;
        this.paqueteRepository = paqueteRepository;
        this.sacaEnDespachoValidator = sacaEnDespachoValidator;
        this.parametroSistemaService = parametroSistemaService;
        this.agenciaCourierEntregaService = agenciaCourierEntregaService;
        this.estadoRastreoService = estadoRastreoService;
        this.guiaMasterService = guiaMasterService;
        this.consignatarioVersionService = consignatarioVersionService;
        this.agenciaVersionService = agenciaVersionService;
        this.agenciaCourierEntregaVersionService = agenciaCourierEntregaVersionService;
        this.codigoSecuenciaService = codigoSecuenciaService;
    }

    /**
     * Resuelve el courier de entrega: null cuando no se indica (permitido en
     * retiro presencial en agencia).
     */
    private CourierEntrega resolverCourierEntrega(Long courierEntregaId) {
        if (courierEntregaId == null) return null;
        return courierEntregaRepository.findById(courierEntregaId)
                .orElseThrow(() -> new ResourceNotFoundException("CourierEntrega", courierEntregaId));
    }

    /**
     * Resuelve el número de guía. Si viene en blanco y el tipo es AGENCIA
     * (retiro presencial), autogenera un código interno RET-AG-xxxxx;
     * {@code existente} permite conservar el número en ediciones.
     */
    private String resolverNumeroGuia(DespachoCreateRequest request, String existente) {
        String ng = request.getNumeroGuia() != null ? request.getNumeroGuia().trim() : "";
        if (!ng.isBlank()) return ng;
        if (existente != null && !existente.isBlank()) return existente;
        // Retiro en oficina (agencia sin courier): autogenera el código interno.
        if (request.getTipoEntrega() == TipoEntrega.AGENCIA && request.getCourierEntregaId() == null) {
            long n = codigoSecuenciaService.siguiente(
                    CodigoSecuenciaService.ENTITY_DESPACHO_RETIRO_AGENCIA,
                    CodigoSecuenciaService.SCOPE_GLOBAL,
                    1L);
            return String.format("RET-AG-%05d", n);
        }
        throw new BadRequestException("El número de guía es obligatorio");
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
        List<DespachoDTO> dtos = despachoRepository.findAll(Sort.by(Sort.Direction.DESC, "id")).stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        aplicarEstadoComun(dtos);
        return dtos;
    }

    /**
     * Variante paginada con búsqueda libre. Campos contemplados por {@code q}:
     * {@code numeroGuia}, {@code codigoPrecinto}, {@code observaciones},
     * {@code courierEntrega.nombre}, {@code agencia.nombre},
     * {@code consignatario.nombre}.
     */
    @Transactional(readOnly = true)
    public Page<DespachoDTO> findAllPaginated(String q, int page, int size) {
        Pageable pageable = Pageables.bounded(page, size, 200,
                Sort.by(Sort.Direction.DESC, "id"));
        Specification<Despacho> spec = SearchSpecifications.tokensLike(q,
                SearchSpecifications.field("numeroGuia"),
                SearchSpecifications.field("codigoPrecinto"),
                SearchSpecifications.field("observaciones"),
                SearchSpecifications.path("courierEntrega", "nombre"),
                SearchSpecifications.path("agencia", "nombre"),
                SearchSpecifications.path("consignatario", "nombre"));
        Page<DespachoDTO> pagina = despachoRepository.findAll(spec, pageable).map(this::toDTO);
        aplicarEstadoComun(pagina.getContent());
        return pagina;
    }

    /**
     * Calcula y asigna el estado de rastreo común de los paquetes de cada despacho (una sola query
     * por lote). El estado representante es el de menor orden (el menos avanzado), y se marca
     * {@code estadoMixto} si los paquetes no comparten un único estado.
     */
    private void aplicarEstadoComun(List<DespachoDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) return;
        List<Long> ids = dtos.stream().map(DespachoDTO::getId).toList();
        List<Object[]> filas = paqueteRepository.findEstadosPaquetesPorDespacho(ids);
        // despachoId -> (estadoId -> [nombre, orden])
        Map<Long, Map<Long, Object[]>> porDespacho = new HashMap<>();
        for (Object[] f : filas) {
            Long despachoId = (Long) f[0];
            Long estadoId = (Long) f[1];
            porDespacho.computeIfAbsent(despachoId, k -> new HashMap<>())
                    .putIfAbsent(estadoId, new Object[]{f[2], f[3]});
        }
        for (DespachoDTO dto : dtos) {
            Map<Long, Object[]> estados = porDespacho.get(dto.getId());
            if (estados == null || estados.isEmpty()) continue;
            dto.setEstadoMixto(estados.size() > 1);
            Long menorId = null;
            String menorNombre = null;
            Integer menorOrden = null;
            for (Map.Entry<Long, Object[]> e : estados.entrySet()) {
                Integer orden = (Integer) e.getValue()[1];
                if (menorOrden == null || (orden != null && orden < menorOrden)) {
                    menorId = e.getKey();
                    menorNombre = (String) e.getValue()[0];
                    menorOrden = orden;
                }
            }
            dto.setEstadoRastreoComunId(menorId);
            dto.setEstadoRastreoComunNombre(menorNombre);
            dto.setEstadoRastreoComunOrden(menorOrden);
        }
    }

    @Transactional
    public DespachoDTO create(DespachoCreateRequest request) {
        CourierEntrega courierEntrega = resolverCourierEntrega(request.getCourierEntregaId());
        EntregaResuelta entrega = resolveEntrega(request);

        List<Long> sacaIds = request.getSacaIds() != null ? request.getSacaIds() : new ArrayList<>();
        validarSacasParaTipoEntrega(request.getTipoEntrega(), sacaIds);

        Usuario operario = currentUserService.getCurrentUsuario();
        LocalDateTime fechaHora = request.getFechaHora() != null ? request.getFechaHora() : LocalDateTime.now();

        Despacho d = Despacho.builder()
                .numeroGuia(resolverNumeroGuia(request, null))
                .observaciones(request.getObservaciones() != null ? request.getObservaciones().trim() : null)
                .codigoPrecinto(request.getCodigoPrecinto() != null ? request.getCodigoPrecinto().trim() : null)
                .operario(operario)
                .fechaHora(fechaHora)
                .courierEntrega(courierEntrega)
                .tipoEntrega(request.getTipoEntrega())
                .consignatario(entrega.consignatario())
                .agencia(entrega.agencia())
                .agenciaCourierEntrega(entrega.agenciaCourierEntrega())
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

        CourierEntrega courierEntrega = resolverCourierEntrega(request.getCourierEntregaId());
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

        d.setNumeroGuia(resolverNumeroGuia(request, d.getNumeroGuia()));
        d.setObservaciones(request.getObservaciones() != null ? request.getObservaciones().trim() : null);
        d.setCodigoPrecinto(request.getCodigoPrecinto() != null ? request.getCodigoPrecinto().trim() : null);
        d.setFechaHora(fechaHora);
        d.setCourierEntrega(courierEntrega);
        d.setTipoEntrega(request.getTipoEntrega());
        d.setConsignatario(entrega.consignatario());
        d.setAgencia(entrega.agencia());
        d.setAgenciaCourierEntrega(entrega.agenciaCourierEntrega());
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
        DespachoDTO dto = toDTO(d);

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

        BigDecimal pesoLbs = despachoRepository.sumPesoLbsPorDespacho(id);
        if (pesoLbs == null) {
            pesoLbs = BigDecimal.ZERO;
        }
        BigDecimal pesoKg = WeightUtil.lbsToKg(pesoLbs);
        if (pesoKg == null) {
            pesoKg = BigDecimal.ZERO;
        }

        String mensaje = aplicarPlaceholdersWhatsApp(
                plantilla,
                dto,
                String.valueOf(cantidadSacas),
                String.valueOf(totalPaquetes),
                String.join(", ", numerosSacaList),
                String.join(", ", paquetesPorSacaList),
                formatearPesoDisplay(pesoLbs),
                formatearPesoDisplay(pesoKg));

        return MensajeWhatsAppDespachoGeneradoDTO.builder()
                .mensaje(mensaje)
                .build();
    }

    private static String aplicarPlaceholdersWhatsApp(
            String plantilla,
            DespachoDTO dto,
            String cantidadSacas,
            String totalPaquetes,
            String numerosSaca,
            String paquetesPorSaca,
            String pesoTotalLbs,
            String pesoTotalKg) {
        String fechaDespacho = dto.getFechaHora() != null
                ? dto.getFechaHora().format(FMT_FECHA_DESPACHO)
                : "";
        String tipoEntregaEtiqueta = etiquetaTipoEntrega(dto.getTipoEntrega());
        String destinoNombre = resolverDestinoNombre(dto);

        String consignatarioNombre = textoSeguro(dto.getConsignatarioNombre());
        String consignatarioTelefono = textoSeguro(dto.getConsignatarioTelefono());
        String consignatarioDireccion = textoSeguro(dto.getConsignatarioDireccion());
        String courierEntregaNombre = textoSeguro(dto.getCourierEntregaNombre());
        String agenciaNombre = textoSeguro(dto.getAgenciaNombre());
        String agenciaCourierEntregaNombre = textoSeguro(dto.getAgenciaCourierEntregaNombre());

        return plantilla
                .replace("{{numeroGuia}}", textoSeguro(dto.getNumeroGuia()))
                .replace("{{fechaDespacho}}", fechaDespacho)
                .replace("{{tipoEntregaEtiqueta}}", tipoEntregaEtiqueta)
                .replace("{{observaciones}}", textoSeguro(dto.getObservaciones()))
                .replace("{{codigoPrecinto}}", textoSeguro(dto.getCodigoPrecinto()))
                .replace("{{consignatarioNombre}}", consignatarioNombre)
                .replace("{{consignatarioTelefono}}", consignatarioTelefono)
                .replace("{{consignatarioDireccion}}", consignatarioDireccion)
                .replace("{{courierEntregaNombre}}", courierEntregaNombre)
                .replace("{{agenciaNombre}}", agenciaNombre)
                .replace("{{agenciaCourierEntregaNombre}}", agenciaCourierEntregaNombre)
                .replace("{{destinoNombre}}", destinoNombre)
                .replace("{{cantidadSacas}}", cantidadSacas)
                .replace("{{totalPaquetes}}", totalPaquetes)
                .replace("{{numerosSaca}}", numerosSaca)
                .replace("{{paquetesPorSaca}}", paquetesPorSaca)
                .replace("{{pesoTotalLbs}}", pesoTotalLbs)
                .replace("{{pesoTotalKg}}", pesoTotalKg)
                // Compatibilidad con placeholders obsoletos (pre-refactor nomenclatura)
                .replace("{{destinatarioNombre}}", consignatarioNombre)
                .replace("{{distribuidorNombre}}", courierEntregaNombre);
    }

    private static String resolverDestinoNombre(DespachoDTO dto) {
        if (dto.getTipoEntrega() == TipoEntrega.DOMICILIO) {
            return textoSeguro(dto.getConsignatarioNombre());
        }
        if (dto.getTipoEntrega() == TipoEntrega.AGENCIA_COURIER_ENTREGA) {
            return textoSeguro(dto.getAgenciaCourierEntregaNombre());
        }
        if (dto.getTipoEntrega() == TipoEntrega.AGENCIA) {
            return textoSeguro(dto.getAgenciaNombre());
        }
        return "";
    }

    private static String etiquetaTipoEntrega(TipoEntrega tipo) {
        if (tipo == null) {
            return "";
        }
        return switch (tipo) {
            case DOMICILIO -> "Domicilio";
            case AGENCIA -> "Agencia aliada";
            case AGENCIA_COURIER_ENTREGA -> "Punto de entrega";
        };
    }

    private static String formatearPesoDisplay(BigDecimal valor) {
        if (valor == null || valor.compareTo(BigDecimal.ZERO) == 0) {
            return "0";
        }
        return valor.setScale(2, RoundingMode.HALF_UP).stripTrailingZeros().toPlainString();
    }

    private static String textoSeguro(String valor) {
        return valor != null ? valor : "";
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
     * El estado es obligatorio, debe ser manual y estrictamente posterior al
     * "estado del punto de despacho".
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
     * de un despacho. Se incluyen estados estrictamente posteriores al "estado del
     * punto de despacho" configurado, ordenados por orden de tracking.
     *
     * <p>Excepción: el estado de "avance masivo por despacho" ({@code estado_rastreo_en_transito})
     * se incluye y se ubica como primera opción aunque pertenezca al conjunto de estados
     * gestionados automáticamente, porque en despachos los estados de los paquetes se manejan
     * de forma masiva a partir de ese punto. El resto de estados reservados se excluyen.</p>
     */
    @Transactional(readOnly = true)
    public List<EstadoRastreoDTO> listarEstadosPosterioresADespacho() {
        Integer ordenDespacho = ordenEstadoEnDespachoOrThrow();
        Long enTransitoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnTransitoId();
        Long entregaConfirmadaId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEntregaConfirmadaClienteId();
        Set<Long> reservados = parametroSistemaService.getIdsEstadosRastreoGestionadosAutomaticamente();
        List<EstadoRastreoDTO> result = new ArrayList<>(
                estadoRastreoService.findActivos().stream()
                        .filter(e -> {
                            Integer orden = e.getOrden() != null ? e.getOrden() : e.getOrdenTracking();
                            boolean posterior = orden != null && orden > ordenDespacho;
                            // Estados ALTERNO (ej. "Retenido en aduana") aplican a paquetes individuales,
                            // no a despachos completos.
                            boolean esNormal = e.getTipoFlujo() != TipoFlujoEstado.ALTERNO;
                            // "en tránsito" y "entrega confirmada" se permiten aunque sean reservados.
                            boolean permitido = !reservados.contains(e.getId())
                                    || e.getId().equals(enTransitoId)
                                    || e.getId().equals(entregaConfirmadaId);
                            return posterior && esNormal && permitido;
                        })
                        .toList());
        // Ubicar "en tránsito" (avance masivo) como primera opción.
        if (enTransitoId != null) {
            result.sort((a, b) -> {
                if (a.getId().equals(enTransitoId)) return -1;
                if (b.getId().equals(enTransitoId)) return 1;
                return 0;
            });
        }
        return result;
    }

    /**
     * Resuelve el estado a aplicar y valida que sea estrictamente posterior al
     * estado del punto de despacho (los paquetes ya están "en despacho" cuando se
     * abre este flujo, así que solo tiene sentido avanzarlos).
     */
    private Long resolverEstadoIdPosteriorADespacho(Long estadoRastreoIdOpcional) {
        Long estadoId = estadoRastreoIdOpcional;
        if (estadoId == null) {
            throw new BadRequestException("Seleccione el estado manual que desea aplicar.");
        }
        // "en tránsito" y "entrega confirmada" son reservados pero se permiten en despachos.
        Long enTransitoId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEnTransitoId();
        Long entregaConfirmadaId = parametroSistemaService.getEstadosRastreoPorPunto().getEstadoRastreoEntregaConfirmadaClienteId();
        if (!estadoId.equals(enTransitoId) && !estadoId.equals(entregaConfirmadaId)) {
            parametroSistemaService.validarEstadoRastreoAplicableManualmente(estadoId);
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

    private Integer ordenEfectivoEstadoOrThrow(Long estadoId) {
        Integer orden = estadoRastreoService.getOrdenById(estadoId);
        if (orden == null) {
            EstadoRastreo entidad = estadoRastreoService.findEntityById(estadoId);
            orden = entidad.getOrden() != null ? entidad.getOrden() : entidad.getOrdenTracking();
        }
        if (orden == null) {
            throw new BadRequestException("El estado seleccionado no tiene un orden de tracking definido");
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
        // Solo avanzar los paquetes cuyo estado actual es anterior al destino: nunca retroceder.
        Integer ordenDestino = ordenEfectivoEstadoOrThrow(estadoId);
        List<Long> paqueteIds = sacaIds.isEmpty()
                ? List.of()
                : paqueteRepository.findIdsBySacaIdInConEstadoAnterior(sacaIds, ordenDestino);
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
        ConsignatarioVersion destSnap = d.getConsignatarioVersion();
        AgenciaVersion agSnap = d.getAgenciaVersion();
        AgenciaCourierEntregaVersion adSnap = d.getAgenciaCourierEntregaVersion();

        String consignatarioNombre;
        String consignatarioDireccion;
        String consignatarioTelefono;
        if (destSnap != null) {
            consignatarioNombre = destSnap.getNombre();
            consignatarioDireccion = destSnap.getDireccion();
            consignatarioTelefono = destSnap.getTelefono();
        } else {
            Consignatario df = d.getConsignatario();
            consignatarioNombre = df != null ? df.getNombre() : null;
            consignatarioDireccion = df != null ? df.getDireccion() : null;
            consignatarioTelefono = df != null ? df.getTelefono() : null;
        }

        String agenciaNombre;
        if (agSnap != null) {
            agenciaNombre = agSnap.getNombre();
        } else {
            agenciaNombre = d.getAgencia() != null ? d.getAgencia().getNombre() : null;
        }

        String agenciaCourierEntregaNombre;
        if (adSnap != null) {
            agenciaCourierEntregaNombre = etiquetaDeVersion(adSnap);
        } else if (d.getAgenciaCourierEntrega() != null) {
            agenciaCourierEntregaNombre = com.ecubox.ecubox_backend.service.AgenciaCourierEntregaService.etiquetaDe(d.getAgenciaCourierEntrega());
        } else {
            agenciaCourierEntregaNombre = null;
        }

        return DespachoDTO.builder()
                .id(d.getId())
                .numeroGuia(d.getNumeroGuia())
                .observaciones(d.getObservaciones())
                .codigoPrecinto(d.getCodigoPrecinto())
                .operarioId(d.getOperario() != null ? d.getOperario().getId() : null)
                .operarioNombre(d.getOperario() != null ? d.getOperario().getUsername() : null)
                .fechaHora(d.getFechaHora())
                .courierEntregaId(d.getCourierEntrega() != null ? d.getCourierEntrega().getId() : null)
                .courierEntregaNombre(d.getCourierEntrega() != null ? d.getCourierEntrega().getNombre() : null)
                .tipoEntrega(d.getTipoEntrega())
                .consignatarioId(d.getConsignatario() != null ? d.getConsignatario().getId() : null)
                .consignatarioNombre(consignatarioNombre)
                .consignatarioDireccion(consignatarioDireccion)
                .consignatarioTelefono(consignatarioTelefono)
                .agenciaId(d.getAgencia() != null ? d.getAgencia().getId() : null)
                .agenciaNombre(agenciaNombre)
                .agenciaCourierEntregaId(d.getAgenciaCourierEntrega() != null ? d.getAgenciaCourierEntrega().getId() : null)
                .agenciaCourierEntregaNombre(agenciaCourierEntregaNombre)
                .consignatarioVersionId(destSnap != null ? destSnap.getId() : null)
                .agenciaVersionId(agSnap != null ? agSnap.getId() : null)
                .agenciaCourierEntregaVersionId(adSnap != null ? adSnap.getId() : null)
                .destinoCongeladoEn(d.getDestinoCongeladoEn())
                .sacaIds(sacaIds)
                .build();
    }

    /**
     * Reconstruye la etiqueta "Provincia, Canton (CODIGO)" desde un snapshot
     * inmutable de agencia de courierEntrega. Mantiene la misma forma que
     * {@link AgenciaCourierEntregaService#etiquetaDe} para consistencia visual.
     */
    private static String etiquetaDeVersion(AgenciaCourierEntregaVersion a) {
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
        if (d.getConsignatario() != null) {
            Consignatario df = d.getConsignatario();
            ConsignatarioVersion v = consignatarioVersionService.getVersionVigente(df.getId())
                    .orElseGet(() -> consignatarioVersionService.crearNuevaVersion(df, null));
            d.setConsignatarioVersion(v);
            alguno = true;
        }
        if (d.getAgencia() != null) {
            Agencia ag = d.getAgencia();
            AgenciaVersion v = agenciaVersionService.getVersionVigente(ag.getId())
                    .orElseGet(() -> agenciaVersionService.crearNuevaVersion(ag, null));
            d.setAgenciaVersion(v);
            alguno = true;
        }
        if (d.getAgenciaCourierEntrega() != null) {
            AgenciaCourierEntrega ad = d.getAgenciaCourierEntrega();
            AgenciaCourierEntregaVersion v = agenciaCourierEntregaVersionService.getVersionVigente(ad.getId())
                    .orElseGet(() -> agenciaCourierEntregaVersionService.crearNuevaVersion(ad, null));
            d.setAgenciaCourierEntregaVersion(v);
            alguno = true;
        }
        if (alguno) {
            d.setDestinoCongeladoEn(LocalDateTime.now());
        }
    }

    /**
     * Verifica que el request no intente cambiar el destino congelado.
     * Permite editar otros campos (numero, observaciones, fechaHora, sacas)
     * pero no el destinatario, agencia, agencia de courierEntrega ni el
     * tipo de entrega.
     */
    private void validarDestinoNoCambia(Despacho d, DespachoCreateRequest request) {
        if (request.getTipoEntrega() != null && d.getTipoEntrega() != request.getTipoEntrega()) {
            throw new BadRequestException(
                    "El tipo de entrega de un despacho ya creado no se puede cambiar (esta congelado para trazabilidad).");
        }
        Long destActual = d.getConsignatario() != null ? d.getConsignatario().getId() : null;
        if (!java.util.Objects.equals(destActual, request.getConsignatarioId())) {
            throw new BadRequestException(
                    "El destinatario del despacho esta congelado y no se puede cambiar. "
                            + "Anula este despacho y crea uno nuevo si necesitas reenrutar el envio.");
        }
        Long agActual = d.getAgencia() != null ? d.getAgencia().getId() : null;
        if (!java.util.Objects.equals(agActual, request.getAgenciaId())) {
            throw new BadRequestException(
                    "La agencia destino del despacho esta congelada y no se puede cambiar.");
        }
        Long adActual = d.getAgenciaCourierEntrega() != null ? d.getAgenciaCourierEntrega().getId() : null;
        if (!java.util.Objects.equals(adActual, request.getAgenciaCourierEntregaId())) {
            throw new BadRequestException(
                    "La agencia de courierEntrega destino del despacho esta congelada y no se puede cambiar.");
        }
    }

    /**
     * Para tipo AGENCIA_COURIER_ENTREGA (y DOMICILIO): todos los paquetes de las sacas deben tener el mismo destinatario final.
     */
    private void validarSacasParaTipoEntrega(TipoEntrega tipoEntrega, List<Long> sacaIds) {
        if (tipoEntrega == TipoEntrega.AGENCIA_COURIER_ENTREGA && !sacaIds.isEmpty()) {
            validarMismoDestinatarioEnSacas(sacaIds);
        }
    }

    private EntregaResuelta resolveEntrega(DespachoCreateRequest request) {
        Consignatario consignatario = null;
        Agencia agencia = null;
        AgenciaCourierEntrega agenciaCourierEntrega = null;

        switch (request.getTipoEntrega()) {
            case DOMICILIO -> {
                if (request.getConsignatarioId() == null) {
                    throw new BadRequestException("Domicilio requiere destinatario final");
                }
                consignatario = consignatarioRepository.findById(request.getConsignatarioId())
                        .orElseThrow(() -> new ResourceNotFoundException("Destinatario", request.getConsignatarioId()));
            }
            case AGENCIA -> {
                if (request.getAgenciaId() == null) {
                    throw new BadRequestException("Agencia requiere agencia seleccionada");
                }
                agencia = agenciaRepository.findById(request.getAgenciaId())
                        .orElseThrow(() -> new ResourceNotFoundException("Agencia", request.getAgenciaId()));
            }
            case AGENCIA_COURIER_ENTREGA -> {
                if (request.getAgenciaCourierEntregaId() == null) {
                    throw new BadRequestException("Agencia de courierEntrega requiere agencia del courierEntrega seleccionada");
                }
                agenciaCourierEntrega = agenciaCourierEntregaService.findEntityById(request.getAgenciaCourierEntregaId());
            }
        }

        return new EntregaResuelta(consignatario, agencia, agenciaCourierEntrega);
    }

    private record EntregaResuelta(
            Consignatario consignatario,
            Agencia agencia,
            AgenciaCourierEntrega agenciaCourierEntrega
    ) {}

    private void validarMismoDestinatarioEnSacas(List<Long> sacaIds) {
        Long refDestinatarioId = null;
        for (Long sacaId : sacaIds) {
            List<Paquete> paquetes = paqueteRepository.findBySacaId(sacaId);
            for (Paquete p : paquetes) {
                Long destId = p.getConsignatario() != null ? p.getConsignatario().getId() : null;
                if (refDestinatarioId == null) {
                    refDestinatarioId = destId;
                } else if (!java.util.Objects.equals(refDestinatarioId, destId)) {
                    throw new BadRequestException("En despacho a agencia de courierEntrega todos los paquetes deben tener el mismo destinatario. Revise los paquetes seleccionados.");
                }
            }
        }
    }
}
