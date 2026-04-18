package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadosRastreoPorPuntoDTO;
import com.ecubox.ecubox_backend.dto.MensajeAgenciaEeuuDTO;
import com.ecubox.ecubox_backend.dto.MensajeWhatsAppDespachoDTO;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.ParametroSistema;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.ParametroSistemaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ParametroSistemaService {

    public static final String CLAVE_MENSAJE_WHATSAPP_DESPACHO = "mensaje_whatsapp_despacho";
    public static final String CLAVE_MENSAJE_AGENCIA_EEUU = "mensaje_agencia_eeuu";

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

    private final ParametroSistemaRepository parametroSistemaRepository;
    private final EstadoRastreoRepository estadoRastreoRepository;

    public ParametroSistemaService(ParametroSistemaRepository parametroSistemaRepository,
                                   EstadoRastreoRepository estadoRastreoRepository) {
        this.parametroSistemaRepository = parametroSistemaRepository;
        this.estadoRastreoRepository = estadoRastreoRepository;
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
