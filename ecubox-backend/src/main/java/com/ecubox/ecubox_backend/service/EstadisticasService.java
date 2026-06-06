package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadisticasDashboardDTO;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.repository.DespachoRepository;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.EstadisticasExcepcionRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.util.Pageables;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class EstadisticasService {

    private static final ZoneId ZONA_ECUADOR = ZoneId.of("America/Guayaquil");
    private static final DateTimeFormatter ETIQUETA_MES =
            DateTimeFormatter.ofPattern("MMM yy", Locale.forLanguageTag("es-EC"));

    private final DespachoRepository despachoRepository;
    private final PaqueteRepository paqueteRepository;
    private final EstadoRastreoRepository estadoRastreoRepository;
    private final EstadisticasExcepcionRepository excepcionRepository;
    private final LiquidacionRepository liquidacionRepository;
    private final ParametroSistemaService parametroSistemaService;

    public EstadisticasService(DespachoRepository despachoRepository,
                               PaqueteRepository paqueteRepository,
                               EstadoRastreoRepository estadoRastreoRepository,
                               EstadisticasExcepcionRepository excepcionRepository,
                               LiquidacionRepository liquidacionRepository,
                               ParametroSistemaService parametroSistemaService) {
        this.despachoRepository = despachoRepository;
        this.paqueteRepository = paqueteRepository;
        this.estadoRastreoRepository = estadoRastreoRepository;
        this.excepcionRepository = excepcionRepository;
        this.liquidacionRepository = liquidacionRepository;
        this.parametroSistemaService = parametroSistemaService;
    }

    @Transactional(readOnly = true)
    public EstadisticasDashboardDTO dashboard(Integer mesesSolicitados) {
        int meses = Math.max(3, Math.min(24, mesesSolicitados != null ? mesesSolicitados : 12));
        LocalDate hoy = LocalDate.now(ZONA_ECUADOR);
        YearMonth primerMes = YearMonth.from(hoy).minusMonths(meses - 1L);
        LocalDateTime desde = primerMes.atDay(1).atStartOfDay();
        LocalDateTime hasta = YearMonth.from(hoy).plusMonths(1).atDay(1).atStartOfDay();
        int diasMaxSinDespachar = parametroSistemaService.getDiasMaxSinDespachar();
        LocalDateTime limiteDemora = LocalDateTime.now(ZONA_ECUADOR).minusDays(diasMaxSinDespachar);
        int ordenTerminal = estadoRastreoRepository
                .findMaxOrdenTrackingActivoByTipoFlujo(TipoFlujoEstado.NORMAL);
        Long estadoDespachoId = parametroSistemaService.getEstadosRastreoPorPunto()
                .getEstadoRastreoEnDespachoId();
        int ordenDespacho = estadoRastreoRepository.findById(estadoDespachoId)
                .map(estado -> estado.getOrdenTracking() != null ? estado.getOrdenTracking() : 0)
                .orElse(0);

        Map<YearMonth, EstadisticasDashboardDTO.SerieMensual> despachos =
                initializeMonths(primerMes, meses);
        for (Object[] row : despachoRepository.aggregateByMonth(desde, hasta)) {
            YearMonth month = toYearMonth(row[0]);
            despachos.put(month, serie(month, longValue(row[1]), longValue(row[2]), decimal(row[3])));
        }

        Map<YearMonth, EstadisticasDashboardDTO.SerieMensual> registros =
                initializeMonths(primerMes, meses);
        for (Object[] row : paqueteRepository.aggregateRegistradosByMonth(desde, hasta)) {
            YearMonth month = toYearMonth(row[0]);
            registros.put(month, serie(month, longValue(row[1]), 0, BigDecimal.ZERO));
        }

        List<EstadisticasDashboardDTO.SerieMensual> despachosSerie =
                new ArrayList<>(despachos.values());
        List<EstadisticasDashboardDTO.SerieMensual> registrosSerie =
                new ArrayList<>(registros.values());
        long totalDespachos = despachosSerie.stream().mapToLong(EstadisticasDashboardDTO.SerieMensual::total).sum();
        long paquetesDespachados = despachosSerie.stream().mapToLong(EstadisticasDashboardDTO.SerieMensual::paquetes).sum();
        BigDecimal pesoDespachado = despachosSerie.stream()
                .map(EstadisticasDashboardDTO.SerieMensual::pesoLbs)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long paquetesRegistrados = paqueteRepository.countRegistradosEntre(desde, hasta);
        Double avgDiasDespacho = paqueteRepository.avgDiasDespachoEntre(desde, hasta);
        Double tiempoPromedioDespachoDias = avgDiasDespacho != null
                ? Math.round(avgDiasDespacho * 10.0) / 10.0
                : null;
        BigDecimal pesoRegistrado = paqueteRepository.sumPesoRegistradoEntre(desde, hasta);
        LiquidacionRepository.TasasEstimacionProjection tasasEstimacion =
                liquidacionRepository.findTasasEstimacionHistoricas();
        BigDecimal margenBruto = estimarPorPeso(
                pesoRegistrado, tasasEstimacion.getMargenPorLibra());
        BigDecimal costoDistribucion = estimarPorPeso(
                pesoRegistrado, tasasEstimacion.getCostoDistribucionPorLibra());
        BigDecimal ingresoNetoAproximado =
                margenBruto.subtract(costoDistribucion).setScale(4, RoundingMode.HALF_UP);

        List<EstadisticasDashboardDTO.DistribucionEstado> estados =
                paqueteRepository.aggregateByEstado().stream()
                        .map(row -> new EstadisticasDashboardDTO.DistribucionEstado(
                                nullableLong(row[0]), string(row[1]), string(row[2]), longValue(row[3])))
                        .toList();

        LocalDate hoyLocal = LocalDate.now(ZONA_ECUADOR);
        List<EstadisticasDashboardDTO.PaqueteDemorado> demorados =
                paqueteRepository.findDemoradosSinDespachar(
                                limiteDemora, ordenTerminal, Pageables.bounded(0, 100, 100))
                        .stream()
                        .map(paquete -> toDemorado(paquete, hoyLocal, diasMaxSinDespachar))
                        .toList();
        List<EstadisticasDashboardDTO.PaqueteInconsistente> entregadosSinDespacho =
                paqueteRepository.findEntregadosSinDespacho(
                                ordenTerminal, Pageables.bounded(0, 100, 100))
                        .stream()
                        .map(EstadisticasService::toInconsistente)
                        .toList();
        List<EstadisticasDashboardDTO.ExcepcionOperativa> excepciones =
                excepcionRepository.findExcepciones(ordenDespacho, ordenTerminal, 200)
                        .stream()
                        .map(EstadisticasService::toExcepcion)
                        .toList();

        return new EstadisticasDashboardDTO(
                LocalDateTime.now(ZONA_ECUADOR),
                desde.toLocalDate(),
                hasta.toLocalDate().minusDays(1),
                diasMaxSinDespachar,
                new EstadisticasDashboardDTO.Resumen(
                        totalDespachos,
                        paquetesDespachados,
                        paquetesRegistrados,
                        paqueteRepository.countPendientesDespacho(ordenTerminal),
                        paqueteRepository.countDemoradosSinDespachar(limiteDemora, ordenTerminal),
                        paqueteRepository.countEntregadosSinDespacho(ordenTerminal),
                        excepcionRepository.countExcepciones(ordenDespacho, ordenTerminal),
                        pesoDespachado,
                        tiempoPromedioDespachoDias,
                        margenBruto,
                        costoDistribucion,
                        ingresoNetoAproximado),
                despachosSerie,
                registrosSerie,
                estados,
                demorados,
                entregadosSinDespacho,
                excepciones);
    }

    private static Map<YearMonth, EstadisticasDashboardDTO.SerieMensual> initializeMonths(
            YearMonth first, int months) {
        Map<YearMonth, EstadisticasDashboardDTO.SerieMensual> result = new LinkedHashMap<>();
        for (int i = 0; i < months; i++) {
            YearMonth month = first.plusMonths(i);
            result.put(month, serie(month, 0, 0, BigDecimal.ZERO));
        }
        return result;
    }

    private static EstadisticasDashboardDTO.SerieMensual serie(
            YearMonth month, long total, long paquetes, BigDecimal pesoLbs) {
        String label = ETIQUETA_MES.format(month.atDay(1));
        return new EstadisticasDashboardDTO.SerieMensual(
                month.toString(),
                Character.toUpperCase(label.charAt(0)) + label.substring(1),
                total,
                paquetes,
                pesoLbs);
    }

    private static EstadisticasDashboardDTO.PaqueteDemorado toDemorado(
            Paquete paquete, LocalDate hoy, int diasMax) {
        long dias = Math.max(0, ChronoUnit.DAYS.between(paquete.getCreatedAt().toLocalDate(), hoy));
        return new EstadisticasDashboardDTO.PaqueteDemorado(
                paquete.getId(),
                paquete.getNumeroGuia(),
                paquete.getRef(),
                paquete.getGuiaMaster() != null ? paquete.getGuiaMaster().getTrackingBase() : null,
                paquete.getGuiaMaster() != null ? paquete.getGuiaMaster().getId() : null,
                paquete.getConsignatario() != null ? paquete.getConsignatario().getNombre() : null,
                paquete.getEstadoRastreo() != null ? paquete.getEstadoRastreo().getNombre() : null,
                paquete.getCreatedAt(),
                dias,
                Math.max(0, dias - diasMax));
    }

    private static EstadisticasDashboardDTO.PaqueteInconsistente toInconsistente(
            Paquete paquete) {
        return new EstadisticasDashboardDTO.PaqueteInconsistente(
                paquete.getId(),
                paquete.getNumeroGuia(),
                paquete.getRef(),
                paquete.getGuiaMaster() != null ? paquete.getGuiaMaster().getTrackingBase() : null,
                paquete.getGuiaMaster() != null ? paquete.getGuiaMaster().getId() : null,
                paquete.getConsignatario() != null ? paquete.getConsignatario().getNombre() : null,
                paquete.getEstadoRastreo() != null ? paquete.getEstadoRastreo().getNombre() : null,
                paquete.getCreatedAt());
    }

    private static EstadisticasDashboardDTO.ExcepcionOperativa toExcepcion(Object[] row) {
        return new EstadisticasDashboardDTO.ExcepcionOperativa(
                string(row[0]),
                string(row[1]),
                string(row[2]),
                nullableLong(row[3]),
                string(row[4]),
                string(row[5]),
                string(row[6]),
                string(row[7]),
                string(row[8]));
    }

    private static YearMonth toYearMonth(Object value) {
        if (value instanceof Timestamp timestamp) {
            return YearMonth.from(timestamp.toLocalDateTime());
        }
        if (value instanceof LocalDateTime dateTime) {
            return YearMonth.from(dateTime);
        }
        if (value instanceof java.sql.Date date) {
            return YearMonth.from(date.toLocalDate());
        }
        return YearMonth.parse(String.valueOf(value).substring(0, 7));
    }

    private static long longValue(Object value) {
        return value instanceof Number number ? number.longValue() : 0L;
    }

    private static BigDecimal decimal(Object value) {
        if (value instanceof BigDecimal decimal) return decimal;
        if (value instanceof Number number) return BigDecimal.valueOf(number.doubleValue());
        return BigDecimal.ZERO;
    }

    private static BigDecimal estimarPorPeso(BigDecimal pesoLbs, BigDecimal tasaPorLibra) {
        return decimal(pesoLbs)
                .multiply(decimal(tasaPorLibra))
                .setScale(4, RoundingMode.HALF_UP);
    }

    private static Long nullableLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private static String string(Object value) {
        return value != null ? value.toString() : null;
    }
}
