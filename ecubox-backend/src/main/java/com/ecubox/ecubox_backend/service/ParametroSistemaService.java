package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.CanalComunicacionItemDTO;
import com.ecubox.ecubox_backend.dto.CanalesComunicacionDTO;
import com.ecubox.ecubox_backend.dto.CanalesComunicacionPublicDTO;
import com.ecubox.ecubox_backend.dto.CanalesComunicacionRequest;
import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.MensajeAgenciaEeuuDTO;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoDTO;
import com.ecubox.ecubox_backend.dto.TemaTemporadaDTO;
import com.ecubox.ecubox_backend.dto.TemaTemporadaRequest;
import com.ecubox.ecubox_backend.dto.TemaTemporadaVentanaDTO;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.ParametroSistema;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.ParametroSistemaRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.regex.Pattern;

@Service
public class ParametroSistemaService {

    public static final String CLAVE_MENSAJE_WHATSAPP_DESPACHO = "mensaje_whatsapp_despacho";
    public static final String CLAVE_MENSAJE_AGENCIA_EEUU = "mensaje_agencia_eeuu";
    public static final String CLAVE_CANALES_COMUNICACION = "canales_comunicacion";
    public static final String CLAVE_TEMA_TEMPORADA = "tema_temporada_override";

    private static final String TEMA_TEMPORADA_DEFAULT = "auto";
    /** Ids de temporada configurables (sin los modos de control). Debe reflejar SEASONS del frontend. */
    private static final java.util.Set<String> TEMA_TEMPORADA_SEASON_IDS = java.util.Set.of(
            "ano-nuevo", "san-valentin", "carnaval", "dia-mujer", "semana-santa", "dia-madre",
            "dia-nino", "dia-padre", "fiestas-patrias", "independencia-guayaquil", "halloween",
            "black-friday", "fiestas-quito", "navidad");
    /** Override admitidos: control automático, apagado o id de temporada concreta. */
    private static final java.util.Set<String> TEMA_TEMPORADA_VALIDOS = java.util.stream.Stream
            .concat(java.util.stream.Stream.of("auto", "off"), TEMA_TEMPORADA_SEASON_IDS.stream())
            .collect(java.util.stream.Collectors.toUnmodifiableSet());
    private static final int TEMA_TEMPORADA_MAX_DIAS_ANTES = 120;
    private static final int TEMA_TEMPORADA_MAX_DIAS_DESPUES = 60;

    private static final Pattern EMAIL_PATTERN =
            Pattern.compile("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$");
    private static final Pattern URL_PATTERN =
            Pattern.compile("^https?://.+", Pattern.CASE_INSENSITIVE);

    public static final String CLAVE_ESTADO_RASTREO_REGISTRO_PAQUETE = "estado_rastreo_registro_paquete";
    public static final String CLAVE_ESTADO_RASTREO_EN_LOTE_RECEPCION = "estado_rastreo_en_lote_recepcion";
    public static final String CLAVE_ESTADO_RASTREO_ASOCIAR_GUIA_MASTER = "estado_rastreo_asociar_guia_master";
    public static final String CLAVE_ESTADO_RASTREO_EN_DESPACHO = "estado_rastreo_en_despacho";
    public static final String CLAVE_ESTADO_RASTREO_EN_TRANSITO = "estado_rastreo_en_transito";
    public static final String CLAVE_ESTADO_RASTREO_INICIO_CUENTA_REGRESIVA = "estado_rastreo_inicio_cuenta_regresiva";
    public static final String CLAVE_ESTADO_RASTREO_FIN_CUENTA_REGRESIVA = "estado_rastreo_fin_cuenta_regresiva";

    public static final String CLAVE_ESTADO_RASTREO_ENVIADO_DESDE_USA = "estado_rastreo_enviado_desde_usa";
    public static final String CLAVE_ESTADO_RASTREO_ARRIBADO_EC = "estado_rastreo_arribado_ec";

    public static final String CLAVE_GM_MIN_PIEZAS_DESPACHO_PARCIAL = "guia_master.min_piezas_para_despacho_parcial";
    public static final String CLAVE_GM_DIAS_AUTO_CIERRE = "guia_master.dias_para_auto_cierre_con_faltante";
    public static final String CLAVE_GM_REQUIERE_CONFIRMACION_DESPACHO_PARCIAL =
            "guia_master.requiere_confirmacion_despacho_parcial";
    public static final String CLAVE_ESTADISTICAS_DIAS_MAX_SIN_DESPACHAR =
            "estadisticas.dias_max_sin_despachar";

    private final ParametroSistemaRepository parametroSistemaRepository;
    private final EstadoRastreoRepository estadoRastreoRepository;
    private final ObjectMapper objectMapper = new ObjectMapper().findAndRegisterModules();

    public ParametroSistemaService(ParametroSistemaRepository parametroSistemaRepository,
                                   EstadoRastreoRepository estadoRastreoRepository) {
        this.parametroSistemaRepository = parametroSistemaRepository;
        this.estadoRastreoRepository = estadoRastreoRepository;
    }

    @Transactional(readOnly = true)
    public int getDiasMaxSinDespachar() {
        return parametroSistemaRepository.findById(CLAVE_ESTADISTICAS_DIAS_MAX_SIN_DESPACHAR)
                .map(ParametroSistema::getValor)
                .map(String::trim)
                .filter(valor -> !valor.isEmpty())
                .map(valor -> {
                    try {
                        return Math.max(1, Math.min(365, Integer.parseInt(valor)));
                    } catch (NumberFormatException ignored) {
                        return 7;
                    }
                })
                .orElse(7);
    }

    @Transactional(readOnly = true)
    public MensajeWhatsAppDespachoDTO getMensajeWhatsAppDespacho() {
        String valor = parametroSistemaRepository.findById(CLAVE_MENSAJE_WHATSAPP_DESPACHO)
                .map(ParametroSistema::getValor)
                .orElse("");
        return MensajeWhatsAppDespachoDTO.builder()
                .plantilla(valor != null ? valor : "")
                .build();
    }

    @Transactional
    public MensajeWhatsAppDespachoDTO updateMensajeWhatsAppDespacho(String plantilla) {
        ParametroSistema param = parametroSistemaRepository.findById(CLAVE_MENSAJE_WHATSAPP_DESPACHO)
                .orElse(ParametroSistema.builder().clave(CLAVE_MENSAJE_WHATSAPP_DESPACHO).valor("").build());
        param.setValor(plantilla != null ? plantilla : "");
        param = parametroSistemaRepository.save(param);
        return MensajeWhatsAppDespachoDTO.builder()
                .plantilla(param.getValor() != null ? param.getValor() : "")
                .build();
    }

    @Transactional(readOnly = true)
    public MensajeAgenciaEeuuDTO getMensajeAgenciaEeuu() {
        String valor = parametroSistemaRepository.findById(CLAVE_MENSAJE_AGENCIA_EEUU)
                .map(ParametroSistema::getValor)
                .orElse("");
        return MensajeAgenciaEeuuDTO.builder()
                .mensaje(valor != null ? valor : "")
                .build();
    }

    @Transactional(readOnly = true)
    public TemaTemporadaDTO getTemaTemporada() {
        String json = parametroSistemaRepository.findById(CLAVE_TEMA_TEMPORADA)
                .map(ParametroSistema::getValor)
                .map(String::trim)
                .filter(v -> !v.isEmpty())
                .orElse(null);
        if (json == null) {
            return TemaTemporadaDTO.builder()
                    .override(TEMA_TEMPORADA_DEFAULT)
                    .ventanas(new java.util.HashMap<>())
                    .build();
        }
        // Compatibilidad: versiones previas guardaban solo el token (p. ej. "auto").
        if (TEMA_TEMPORADA_VALIDOS.contains(json)) {
            return TemaTemporadaDTO.builder()
                    .override(json)
                    .ventanas(new java.util.HashMap<>())
                    .build();
        }
        try {
            TemaTemporadaDTO parsed = objectMapper.readValue(json, TemaTemporadaDTO.class);
            String override = parsed.getOverride() != null && TEMA_TEMPORADA_VALIDOS.contains(parsed.getOverride())
                    ? parsed.getOverride()
                    : TEMA_TEMPORADA_DEFAULT;
            return TemaTemporadaDTO.builder()
                    .override(override)
                    .ventanas(sanitizeVentanas(parsed.getVentanas()))
                    .build();
        } catch (JsonProcessingException e) {
            return TemaTemporadaDTO.builder()
                    .override(TEMA_TEMPORADA_DEFAULT)
                    .ventanas(new java.util.HashMap<>())
                    .build();
        }
    }

    @Transactional
    public TemaTemporadaDTO updateTemaTemporada(TemaTemporadaRequest request) {
        String override = request != null && request.getOverride() != null ? request.getOverride().trim() : "";
        if (!TEMA_TEMPORADA_VALIDOS.contains(override)) {
            throw new BadRequestException("El tema de temporada no es válido");
        }
        java.util.Map<String, TemaTemporadaVentanaDTO> ventanas =
                sanitizeVentanas(request != null ? request.getVentanas() : null);
        TemaTemporadaDTO dto = TemaTemporadaDTO.builder().override(override).ventanas(ventanas).build();
        try {
            saveParametro(CLAVE_TEMA_TEMPORADA, objectMapper.writeValueAsString(dto));
        } catch (JsonProcessingException e) {
            throw new BadRequestException("No se pudo guardar el tema de temporada");
        }
        return dto;
    }

    /** Acota las ventanas a rangos seguros e ignora ids de temporada desconocidos. */
    private java.util.Map<String, TemaTemporadaVentanaDTO> sanitizeVentanas(
            java.util.Map<String, TemaTemporadaVentanaDTO> raw) {
        java.util.Map<String, TemaTemporadaVentanaDTO> out = new java.util.HashMap<>();
        if (raw == null) {
            return out;
        }
        for (var entry : raw.entrySet()) {
            String id = entry.getKey();
            TemaTemporadaVentanaDTO v = entry.getValue();
            if (id == null || v == null || !TEMA_TEMPORADA_SEASON_IDS.contains(id)) {
                continue;
            }
            out.put(id, TemaTemporadaVentanaDTO.builder()
                    .diasAntes(clamp(v.getDiasAntes(), 0, TEMA_TEMPORADA_MAX_DIAS_ANTES))
                    .diasDespues(clamp(v.getDiasDespues(), 0, TEMA_TEMPORADA_MAX_DIAS_DESPUES))
                    .build());
        }
        return out;
    }

    private int clamp(Integer valor, int min, int max) {
        int v = valor != null ? valor : min;
        return Math.max(min, Math.min(max, v));
    }

    @Transactional(readOnly = true)
    public CanalesComunicacionDTO getCanalesComunicacion() {
        return loadCanalesComunicacion();
    }

    @Transactional(readOnly = true)
    public CanalesComunicacionPublicDTO getCanalesComunicacionPublic() {
        CanalesComunicacionDTO full = loadCanalesComunicacion();
        return CanalesComunicacionPublicDTO.builder()
                .email(publicValor(full.getEmail()))
                .telefono(publicValor(full.getTelefono()))
                .whatsapp(publicValor(full.getWhatsapp()))
                .facebook(publicValor(full.getFacebook()))
                .instagram(publicValor(full.getInstagram()))
                .tiktok(publicValor(full.getTiktok()))
                .youtube(publicValor(full.getYoutube()))
                .linkedin(publicValor(full.getLinkedin()))
                .x(publicValor(full.getX()))
                .build();
    }

    @Transactional
    public CanalesComunicacionDTO updateCanalesComunicacion(CanalesComunicacionRequest request) {
        CanalesComunicacionDTO normalized = CanalesComunicacionDTO.builder()
                .email(normalizeCanal(request.getEmail(), "email", CanalTipo.EMAIL))
                .telefono(normalizeCanal(request.getTelefono(), "teléfono", CanalTipo.TELEFONO))
                .whatsapp(normalizeCanal(request.getWhatsapp(), "WhatsApp", CanalTipo.WHATSAPP))
                .facebook(normalizeCanal(request.getFacebook(), "Facebook", CanalTipo.URL))
                .instagram(normalizeCanal(request.getInstagram(), "Instagram", CanalTipo.URL))
                .tiktok(normalizeCanal(request.getTiktok(), "TikTok", CanalTipo.URL))
                .youtube(normalizeCanal(request.getYoutube(), "YouTube", CanalTipo.URL))
                .linkedin(normalizeCanal(request.getLinkedin(), "LinkedIn", CanalTipo.URL))
                .x(normalizeCanal(request.getX(), "X", CanalTipo.URL))
                .build();
        saveCanalesComunicacion(normalized);
        return normalized;
    }

    private CanalesComunicacionDTO loadCanalesComunicacion() {
        String json = parametroSistemaRepository.findById(CLAVE_CANALES_COMUNICACION)
                .map(ParametroSistema::getValor)
                .orElse("{}");
        if (json == null || json.isBlank()) {
            return emptyCanalesComunicacion();
        }
        try {
            CanalesComunicacionDTO parsed = objectMapper.readValue(json, CanalesComunicacionDTO.class);
            return normalizeLoaded(parsed);
        } catch (JsonProcessingException e) {
            return emptyCanalesComunicacion();
        }
    }

    private CanalesComunicacionDTO normalizeLoaded(CanalesComunicacionDTO parsed) {
        if (parsed == null) {
            return emptyCanalesComunicacion();
        }
        return CanalesComunicacionDTO.builder()
                .email(mergeLegacyItem(parsed.getEmail()))
                .telefono(mergeLegacyItem(parsed.getTelefono()))
                .whatsapp(mergeLegacyItem(parsed.getWhatsapp()))
                .facebook(mergeLegacyItem(parsed.getFacebook()))
                .instagram(mergeLegacyItem(parsed.getInstagram()))
                .tiktok(mergeLegacyItem(parsed.getTiktok()))
                .youtube(mergeLegacyItem(parsed.getYoutube()))
                .linkedin(mergeLegacyItem(parsed.getLinkedin()))
                .x(mergeLegacyItem(parsed.getX()))
                .build();
    }

    private CanalComunicacionItemDTO mergeLegacyItem(CanalComunicacionItemDTO item) {
        if (item == null) {
            return emptyItem();
        }
        String valor = item.getValor() != null ? item.getValor().trim() : "";
        boolean visible = resolveVisible(valor, item.getVisible());
        return CanalComunicacionItemDTO.builder().valor(valor).visible(visible).build();
    }

    private boolean resolveVisible(String valor, Boolean visibleFlag) {
        if (valor == null || valor.isEmpty()) {
            return false;
        }
        if (visibleFlag == null) {
            return true;
        }
        return Boolean.TRUE.equals(visibleFlag);
    }

    private enum CanalTipo { EMAIL, TELEFONO, WHATSAPP, URL }

    private CanalComunicacionItemDTO normalizeCanal(CanalComunicacionItemDTO item, String label, CanalTipo tipo) {
        if (item == null) {
            return emptyItem();
        }
        String valor = item.getValor() != null ? item.getValor().trim() : "";
        if (valor.isEmpty()) {
            return emptyItem();
        }
        if (valor.length() > 500) {
            throw new BadRequestException("El valor de " + label + " no puede superar 500 caracteres");
        }
        switch (tipo) {
            case EMAIL -> {
                if (!EMAIL_PATTERN.matcher(valor).matches()) {
                    throw new BadRequestException("El correo electrónico no es válido");
                }
            }
            case TELEFONO -> {
                if (valor.length() > 30) {
                    throw new BadRequestException("El teléfono no puede superar 30 caracteres");
                }
            }
            case WHATSAPP -> {
                if (valor.length() > 200) {
                    throw new BadRequestException("WhatsApp no puede superar 200 caracteres");
                }
            }
            case URL -> {
                if (!URL_PATTERN.matcher(valor).matches()) {
                    throw new BadRequestException("La URL de " + label + " debe comenzar con http:// o https://");
                }
            }
        }
        boolean visible = resolveVisible(valor, item.getVisible());
        return CanalComunicacionItemDTO.builder().valor(valor).visible(visible).build();
    }

    private String publicValor(CanalComunicacionItemDTO item) {
        if (item == null) {
            return null;
        }
        String valor = item.getValor() != null ? item.getValor().trim() : "";
        if (!resolveVisible(valor, item.getVisible())) {
            return null;
        }
        return valor;
    }

    private void saveCanalesComunicacion(CanalesComunicacionDTO dto) {
        try {
            String json = objectMapper.writeValueAsString(dto);
            ParametroSistema param = parametroSistemaRepository.findById(CLAVE_CANALES_COMUNICACION)
                    .orElse(ParametroSistema.builder().clave(CLAVE_CANALES_COMUNICACION).valor("{}").build());
            param.setValor(json);
            parametroSistemaRepository.save(param);
        } catch (JsonProcessingException e) {
            throw new BadRequestException("No se pudo guardar la configuración de canales");
        }
    }

    private CanalesComunicacionDTO emptyCanalesComunicacion() {
        return CanalesComunicacionDTO.builder()
                .email(emptyItem())
                .telefono(emptyItem())
                .whatsapp(emptyItem())
                .facebook(emptyItem())
                .instagram(emptyItem())
                .tiktok(emptyItem())
                .youtube(emptyItem())
                .linkedin(emptyItem())
                .x(emptyItem())
                .build();
    }

    private CanalComunicacionItemDTO emptyItem() {
        return CanalComunicacionItemDTO.builder().valor("").visible(Boolean.FALSE).build();
    }

    @Transactional
    public MensajeAgenciaEeuuDTO updateMensajeAgenciaEeuu(String mensaje) {
        ParametroSistema param = parametroSistemaRepository.findById(CLAVE_MENSAJE_AGENCIA_EEUU)
                .orElse(ParametroSistema.builder().clave(CLAVE_MENSAJE_AGENCIA_EEUU).valor("").build());
        param.setValor(mensaje != null ? mensaje : "");
        param = parametroSistemaRepository.save(param);
        return MensajeAgenciaEeuuDTO.builder()
                .mensaje(param.getValor() != null ? param.getValor() : "")
                .build();
    }

    @Transactional(readOnly = true)
    public EstadosRastreoPorPuntoDTO getEstadosRastreoPorPunto() {
        Long registro = getParametroAsLong(CLAVE_ESTADO_RASTREO_REGISTRO_PAQUETE);
        Long enLote = getParametroAsLong(CLAVE_ESTADO_RASTREO_EN_LOTE_RECEPCION);
        Long enDespacho = getParametroAsLong(CLAVE_ESTADO_RASTREO_EN_DESPACHO);
        if (registro == null) {
            registro = estadoRastreoRepository.findByCodigo("REGISTRADO")
                    .map(er -> er.getId())
                    .orElse(null);
        }
        if (registro == null && !estadoRastreoRepository.findAll().isEmpty()) {
            registro = estadoRastreoRepository.findAll().get(0).getId();
        }
        if (enLote == null) enLote = registro;
        if (enDespacho == null) enDespacho = registro;
        Long enTransito = getParametroAsLong(CLAVE_ESTADO_RASTREO_EN_TRANSITO);
        if (enTransito == null) {
            enTransito = estadoRastreoRepository.findByCodigo("EN_TRANSITO")
                    .map(EstadoRastreo::getId)
                    .orElse(enDespacho);
        }
        Long asociarGuiaMaster = getParametroAsLong(CLAVE_ESTADO_RASTREO_ASOCIAR_GUIA_MASTER);
        Long inicioCuentaRegresiva = getParametroAsLong(CLAVE_ESTADO_RASTREO_INICIO_CUENTA_REGRESIVA);
        Long finCuentaRegresiva = getParametroAsLong(CLAVE_ESTADO_RASTREO_FIN_CUENTA_REGRESIVA);
        return EstadosRastreoPorPuntoDTO.builder()
                .estadoRastreoRegistroPaqueteId(registro)
                .estadoRastreoEnLoteRecepcionId(enLote)
                .estadoRastreoAsociarGuiaMasterId(asociarGuiaMaster)
                .estadoRastreoEnDespachoId(enDespacho)
                .estadoRastreoEnTransitoId(enTransito)
                .estadoRastreoInicioCuentaRegresivaId(inicioCuentaRegresiva)
                .estadoRastreoFinCuentaRegresivaId(finCuentaRegresiva)
                .build();
    }

    private Long getParametroAsLong(String clave) {
        String valor = parametroSistemaRepository.findById(clave)
                .map(ParametroSistema::getValor)
                .orElse(null);
        if (valor == null || valor.isBlank()) return null;
        try {
            return Long.parseLong(valor.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    @Transactional
    public EstadosRastreoPorPuntoDTO updateEstadosRastreoPorPunto(Long registroPaqueteId,
                                                                  Long enLoteRecepcionId,
                                                                  Long asociarGuiaMasterId,
                                                                  Long enDespachoId,
                                                                  Long enTransitoId,
                                                                  Long inicioCuentaRegresivaId,
                                                                  Long finCuentaRegresivaId) {
        if (registroPaqueteId != null && estadoRastreoRepository.findById(registroPaqueteId).isEmpty()) {
            throw new BadRequestException("Estado de rastreo para registro de paquete no encontrado");
        }
        if (enLoteRecepcionId != null && estadoRastreoRepository.findById(enLoteRecepcionId).isEmpty()) {
            throw new BadRequestException("Estado de rastreo para lote de recepción no encontrado");
        }
        if (asociarGuiaMasterId != null && estadoRastreoRepository.findById(asociarGuiaMasterId).isEmpty()) {
            throw new BadRequestException("Estado de rastreo para asociar guía master no encontrado");
        }
        if (enDespachoId != null && estadoRastreoRepository.findById(enDespachoId).isEmpty()) {
            throw new BadRequestException("Estado de rastreo para despacho no encontrado");
        }
        if (enTransitoId != null && estadoRastreoRepository.findById(enTransitoId).isEmpty()) {
            throw new BadRequestException("Estado de rastreo para en tránsito no encontrado");
        }
        if (inicioCuentaRegresivaId != null && estadoRastreoRepository.findById(inicioCuentaRegresivaId).isEmpty()) {
            throw new BadRequestException("Estado de rastreo para inicio de cuenta regresiva no encontrado");
        }
        if (finCuentaRegresivaId != null && estadoRastreoRepository.findById(finCuentaRegresivaId).isEmpty()) {
            throw new BadRequestException("Estado de rastreo para fin de cuenta regresiva no encontrado");
        }
        EstadosRastreoPorPuntoDTO actuales = getEstadosRastreoPorPunto();
        Long registro = registroPaqueteId != null ? registroPaqueteId : actuales.getEstadoRastreoRegistroPaqueteId();
        Long enLote = enLoteRecepcionId != null ? enLoteRecepcionId : actuales.getEstadoRastreoEnLoteRecepcionId();
        Long asociarGuia = asociarGuiaMasterId != null
                ? asociarGuiaMasterId
                : actuales.getEstadoRastreoAsociarGuiaMasterId();
        Long enDespacho = enDespachoId != null ? enDespachoId : actuales.getEstadoRastreoEnDespachoId();
        Long enTransito = enTransitoId != null ? enTransitoId : actuales.getEstadoRastreoEnTransitoId();
        Long inicioCuentaRegresiva = inicioCuentaRegresivaId != null
                ? inicioCuentaRegresivaId
                : actuales.getEstadoRastreoInicioCuentaRegresivaId();
        Long finCuentaRegresiva =
                finCuentaRegresivaId != null ? finCuentaRegresivaId : actuales.getEstadoRastreoFinCuentaRegresivaId();
        if (registro == null) {
            throw new BadRequestException("No existe un estado válido para registro de paquete");
        }
        if (enLote == null) enLote = registro;
        if (enDespacho == null) enDespacho = registro;
        if (enTransito == null) enTransito = enDespacho;
        if (inicioCuentaRegresiva != null && finCuentaRegresiva != null
                && inicioCuentaRegresiva.equals(finCuentaRegresiva)) {
            throw new BadRequestException(
                    "El estado de inicio y fin de la cuenta regresiva deben ser distintos");
        }
        saveParametro(CLAVE_ESTADO_RASTREO_REGISTRO_PAQUETE, String.valueOf(registro));
        saveParametro(CLAVE_ESTADO_RASTREO_EN_LOTE_RECEPCION, String.valueOf(enLote));
        saveParametro(CLAVE_ESTADO_RASTREO_ASOCIAR_GUIA_MASTER, asociarGuia != null ? String.valueOf(asociarGuia) : "");
        saveParametro(CLAVE_ESTADO_RASTREO_EN_DESPACHO, String.valueOf(enDespacho));
        saveParametro(CLAVE_ESTADO_RASTREO_EN_TRANSITO, String.valueOf(enTransito));
        saveParametro(CLAVE_ESTADO_RASTREO_INICIO_CUENTA_REGRESIVA,
                inicioCuentaRegresiva != null ? String.valueOf(inicioCuentaRegresiva) : "");
        saveParametro(CLAVE_ESTADO_RASTREO_FIN_CUENTA_REGRESIVA, finCuentaRegresiva != null ? String.valueOf(finCuentaRegresiva) : "");
        return getEstadosRastreoPorPunto();
    }

    private void saveParametro(String clave, String valor) {
        ParametroSistema param = parametroSistemaRepository.findById(clave)
                .orElse(ParametroSistema.builder().clave(clave).valor(valor).build());
        param.setValor(valor);
        parametroSistemaRepository.save(param);
    }

    @Transactional(readOnly = true)
    public Long getEstadoRastreoEnviadoDesdeUsaId() {
        return getParametroAsLong(CLAVE_ESTADO_RASTREO_ENVIADO_DESDE_USA);
    }

    @Transactional(readOnly = true)
    public Long getEstadoRastreoArribadoEcId() {
        return getParametroAsLong(CLAVE_ESTADO_RASTREO_ARRIBADO_EC);
    }

    @Transactional(readOnly = true)
    public int getGuiaMasterMinPiezasDespachoParcial() {
        Long valor = getParametroAsLong(CLAVE_GM_MIN_PIEZAS_DESPACHO_PARCIAL);
        return valor == null ? 1 : Math.max(1, valor.intValue());
    }

    @Transactional(readOnly = true)
    public int getGuiaMasterDiasAutoCierre() {
        Long valor = getParametroAsLong(CLAVE_GM_DIAS_AUTO_CIERRE);
        return valor == null ? 0 : Math.max(0, valor.intValue());
    }

    @Transactional(readOnly = true)
    public boolean getGuiaMasterRequiereConfirmacionDespachoParcial() {
        String valor = parametroSistemaRepository.findById(CLAVE_GM_REQUIERE_CONFIRMACION_DESPACHO_PARCIAL)
                .map(ParametroSistema::getValor)
                .orElse("true");
        return valor == null || valor.isBlank() || "true".equalsIgnoreCase(valor.trim());
    }
}
