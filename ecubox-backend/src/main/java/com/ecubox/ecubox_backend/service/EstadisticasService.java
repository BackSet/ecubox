package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadisticasConsulta;
import com.ecubox.ecubox_backend.dto.EstadisticasDashboardDTO;
import com.ecubox.ecubox_backend.dto.EstadisticasDashboardDTO.MetricaComparable;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.DisponibilidadMetrica;
import com.ecubox.ecubox_backend.enums.GranularidadEstadisticas;
import com.ecubox.ecubox_backend.enums.TipoFlujoEstado;
import com.ecubox.ecubox_backend.enums.TrackingEventType;
import com.ecubox.ecubox_backend.repository.EstadoRastreoRepository;
import com.ecubox.ecubox_backend.repository.EstadisticasExcepcionRepository;
import com.ecubox.ecubox_backend.repository.LiquidacionRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.util.Pageables;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.IsoFields;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class EstadisticasService {

    private static final ZoneId ZONA_ECUADOR = ZoneId.of("America/Guayaquil");
    private static final int DIAS_MAX_PROCESO_LABORABLES = 12;
    private static final Locale LOCALE_EC = Locale.forLanguageTag("es-EC");
    private static final DateTimeFormatter ETIQUETA_DIA =
            DateTimeFormatter.ofPattern("d MMM", LOCALE_EC);
    private static final DateTimeFormatter ETIQUETA_MES =
            DateTimeFormatter.ofPattern("MMM yy", LOCALE_EC);
    private static final DateTimeFormatter FMT_COBERTURA =
            DateTimeFormatter.ofPattern("d MMM yyyy", LOCALE_EC);
    private static final BigDecimal CIEN = BigDecimal.valueOf(100);

    private final PaqueteRepository paqueteRepository;
    private final PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    private final EstadoRastreoRepository estadoRastreoRepository;
    private final EstadisticasExcepcionRepository excepcionRepository;
    private final LiquidacionRepository liquidacionRepository;
    private final ParametroSistemaService parametroSistemaService;
    private final PeriodoEstadisticasResolver periodoResolver;

    public EstadisticasService(PaqueteRepository paqueteRepository,
                               PaqueteEstadoEventoRepository paqueteEstadoEventoRepository,
                               EstadoRastreoRepository estadoRastreoRepository,
                               EstadisticasExcepcionRepository excepcionRepository,
                               LiquidacionRepository liquidacionRepository,
                               ParametroSistemaService parametroSistemaService,
                               PeriodoEstadisticasResolver periodoResolver) {
        this.paqueteRepository = paqueteRepository;
        this.paqueteEstadoEventoRepository = paqueteEstadoEventoRepository;
        this.estadoRastreoRepository = estadoRastreoRepository;
        this.excepcionRepository = excepcionRepository;
        this.liquidacionRepository = liquidacionRepository;
        this.parametroSistemaService = parametroSistemaService;
        this.periodoResolver = periodoResolver;
    }

    /** Compatibilidad heredada: {@code ?meses=N}. */
    @Transactional(readOnly = true)
    public EstadisticasDashboardDTO dashboard(Integer mesesSolicitados) {
        return dashboard(new EstadisticasConsulta(
                null, null, null, null, null, null, mesesSolicitados));
    }

    @Transactional(readOnly = true)
    public EstadisticasDashboardDTO dashboard(EstadisticasConsulta consulta) {
        LocalDate hoy = LocalDate.now(ZONA_ECUADOR);
        PeriodoEstadisticasResolver.Resuelto periodo = periodoResolver.resolver(consulta, hoy);
        GranularidadEstadisticas granularidad = periodo.granularidad();

        LocalDateTime desde = periodo.desde().atStartOfDay();
        LocalDateTime hasta = periodo.hastaExclusivo().atStartOfDay();
        LocalDateTime antDesde = periodo.anteriorDesde().atStartOfDay();
        LocalDateTime antHasta = periodo.anteriorHastaExclusivo().atStartOfDay();

        // Estado configurado como "despacho": solo para distinguir SIN_CONFIGURACION
        // y para el orden del estado operativo actual. La MÉTRICA de despacho se
        // ancla en el event_type semántico estable, no en este id mutable.
        Long estadoDespachoId = parametroSistemaService.getEstadosRastreoPorPunto()
                .getEstadoRastreoEnDespachoId();
        final String eventoDespacho = TrackingEventType.ESTADO_APLICADO_DESPACHO.name();

        // ── Resultados del periodo (histórico + comparación) ──
        // Paquetes despachados: primera transición auditable al evento de despacho.
        ResumenDespachados despActual = resumenDespachados(eventoDespacho, desde, hasta);
        ResumenDespachados despAnterior = resumenDespachados(eventoDespacho, antDesde, antHasta);

        long registradosActual = paqueteRepository.countRegistradosEntre(desde, hasta);
        long registradosAnterior = paqueteRepository.countRegistradosEntre(antDesde, antHasta);

        BigDecimal pesoRegActual = paqueteRepository.sumPesoRegistradoEntre(desde, hasta);
        BigDecimal pesoRegAnterior = paqueteRepository.sumPesoRegistradoEntre(antDesde, antHasta);

        Double avgActual = paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(eventoDespacho, desde, hasta);
        Double avgAnterior = paqueteEstadoEventoRepository.avgDiasPrimerDespachoEntre(eventoDespacho, antDesde, antHasta);

        // Estimaciones financieras (NO contables): peso REGISTRADO × tasas históricas.
        LiquidacionRepository.TasasEstimacionProjection tasas =
                liquidacionRepository.findTasasEstimacionHistoricas();
        BigDecimal margenActual = estimarPorPeso(pesoRegActual, tasas.getMargenPorLibra());
        BigDecimal margenAnterior = estimarPorPeso(pesoRegAnterior, tasas.getMargenPorLibra());
        BigDecimal costoActual = estimarPorPeso(pesoRegActual, tasas.getCostoDistribucionPorLibra());
        BigDecimal costoAnterior = estimarPorPeso(pesoRegAnterior, tasas.getCostoDistribucionPorLibra());
        BigDecimal ingresoActual = margenActual.subtract(costoActual).setScale(4, RoundingMode.HALF_UP);
        BigDecimal ingresoAnterior = margenAnterior.subtract(costoAnterior).setScale(4, RoundingMode.HALF_UP);

        List<Object[]> filasDespachados = paqueteEstadoEventoRepository.aggregateDespachadosByPeriodo(
                granularidad.getTruncUnit(), eventoDespacho, desde, hasta);
        List<EstadisticasDashboardDTO.SeriePunto> paquetesDespachadosSerie = buildSerie(
                granularidad, periodo.desde(), periodo.hastaExclusivo(), filasDespachados, true);
        List<EstadisticasDashboardDTO.SeriePunto> registrosSerie = buildSerie(
                granularidad, periodo.desde(), periodo.hastaExclusivo(),
                paqueteRepository.aggregateRegistradosByPeriodo(granularidad.getTruncUnit(), desde, hasta),
                false);

        EstadisticasDashboardDTO.ResultadosPeriodo resultados =
                new EstadisticasDashboardDTO.ResultadosPeriodo(
                        comparable(BigDecimal.valueOf(despActual.paquetes()),
                                BigDecimal.valueOf(despAnterior.paquetes())),
                        comparable(BigDecimal.valueOf(registradosActual),
                                BigDecimal.valueOf(registradosAnterior)),
                        comparable(despActual.peso(), despAnterior.peso()),
                        comparable(redondearDias(avgActual), redondearDias(avgAnterior)),
                        comparable(margenActual, margenAnterior),
                        comparable(costoActual, costoAnterior),
                        comparable(ingresoActual, ingresoAnterior),
                        paquetesDespachadosSerie,
                        registrosSerie);

        // ── Estado operativo actual (fotografía, sin comparación histórica) ──
        EstadisticasDashboardDTO.EstadoOperativoActual estadoActual = estadoActual();

        // ── Disponibilidad de las métricas de despacho ──
        Object[] coberturaRow = paqueteEstadoEventoRepository.coberturaDespachados(eventoDespacho);
        EstadisticasDashboardDTO.DisponibilidadDespacho disponibilidad =
                calcularDisponibilidadDespacho(coberturaRow, estadoDespachoId != null, desde);

        return new EstadisticasDashboardDTO(
                LocalDateTime.now(ZONA_ECUADOR),
                granularidad,
                periodo.parcial(),
                new EstadisticasDashboardDTO.Periodo(
                        periodo.preset(), periodo.desde(), periodo.hastaExclusivo(),
                        periodo.hastaExclusivo().minusDays(1)),
                new EstadisticasDashboardDTO.Periodo(
                        periodo.preset(), periodo.anteriorDesde(), periodo.anteriorHastaExclusivo(),
                        periodo.anteriorHastaExclusivo().minusDays(1)),
                DIAS_MAX_PROCESO_LABORABLES,
                resultados,
                estadoActual,
                disponibilidad);
    }

    // ───────────────────────── Estado operativo actual ─────────────────────────

    private EstadisticasDashboardDTO.EstadoOperativoActual estadoActual() {
        int ordenTerminal = estadoRastreoRepository
                .findMaxOrdenTrackingActivoByTipoFlujo(TipoFlujoEstado.NORMAL);
        Long estadoDespachoId = parametroSistemaService.getEstadosRastreoPorPunto()
                .getEstadoRastreoEnDespachoId();
        int ordenDespacho = estadoDespachoId == null ? 0
                : estadoRastreoRepository.findById(estadoDespachoId)
                        .map(estado -> estado.getOrdenTracking() != null ? estado.getOrdenTracking() : 0)
                        .orElse(0);
        int diasMax = DIAS_MAX_PROCESO_LABORABLES;
        LocalDate hoyLocal = LocalDate.now(ZONA_ECUADOR);

        List<EstadisticasDashboardDTO.DistribucionEstado> estados =
                paqueteRepository.aggregateByEstado().stream()
                        .map(row -> new EstadisticasDashboardDTO.DistribucionEstado(
                                nullableLong(row[0]), string(row[1]), string(row[2]), longValue(row[3])))
                        .toList();
        List<EstadisticasDashboardDTO.PaqueteDemorado> demorados =
                paqueteRepository.findDemoradosSinDespachar(
                                hoyLocal, diasMax, ordenTerminal, Pageables.bounded(0, 100, 100))
                        .stream()
                        .map(paquete -> toDemorado(paquete, hoyLocal, diasMax))
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

        return new EstadisticasDashboardDTO.EstadoOperativoActual(
                paqueteRepository.countPendientesDespacho(ordenTerminal),
                paqueteRepository.countDemoradosSinDespachar(hoyLocal, diasMax, ordenTerminal),
                paqueteRepository.countEntregadosSinDespacho(ordenTerminal),
                excepcionRepository.countExcepciones(ordenDespacho, ordenTerminal),
                estados,
                demorados,
                entregadosSinDespacho,
                excepciones);
    }

    // ───────────────────────── Series por granularidad ─────────────────────────

    private record ResumenDespachados(long paquetes, BigDecimal peso) {
    }

    /**
     * Resumen de paquetes despachados en el rango por su evento canónico de
     * despacho. Cuenta paquetes únicos (no entidades despacho) y suma su peso.
     */
    private ResumenDespachados resumenDespachados(String eventType,
                                                  LocalDateTime desde, LocalDateTime hasta) {
        Object[] row = paqueteEstadoEventoRepository.resumenDespachadosEntre(eventType, desde, hasta);
        if (row == null || row.length < 2) {
            return new ResumenDespachados(0, BigDecimal.ZERO);
        }
        return new ResumenDespachados(longValue(row[0]), decimal(row[1]));
    }

    /**
     * Clasifica la disponibilidad de las métricas de despacho a partir de la
     * cobertura global de eventos y de si el hito está configurado. No usa 0
     * como sustituto de "sin datos": distingue cero real (COMPLETA, total 0),
     * falta de configuración, falta de historial y cobertura parcial.
     *
     * @param coberturaRow {@code [coberturaDesde, coberturaHasta, totalConEvento]}
     * @param configurado  si el hito de despacho está configurado
     * @param periodoDesde inicio del periodo consultado (para detectar parcialidad)
     */
    private EstadisticasDashboardDTO.DisponibilidadDespacho calcularDisponibilidadDespacho(
            Object[] coberturaRow, boolean configurado, LocalDateTime periodoDesde) {
        LocalDateTime covDesde = coberturaRow != null && coberturaRow.length > 0
                ? toLocalDateTime(coberturaRow[0]) : null;
        LocalDateTime covHasta = coberturaRow != null && coberturaRow.length > 1
                ? toLocalDateTime(coberturaRow[1]) : null;
        long totalConEvento = coberturaRow != null && coberturaRow.length > 2 ? longValue(coberturaRow[2]) : 0L;

        DisponibilidadMetrica estado;
        String advertencia;
        if (totalConEvento == 0 || covDesde == null) {
            // Sin ningún evento de despacho: el hito no configurado tiene prioridad
            // (hay que configurarlo); si está configurado, simplemente no hay historial.
            if (!configurado) {
                estado = DisponibilidadMetrica.SIN_CONFIGURACION;
                advertencia = "Configura el hito de despacho para calcular esta métrica";
            } else {
                estado = DisponibilidadMetrica.SIN_HISTORIAL;
                advertencia = "No hay historial suficiente para este periodo";
            }
        } else if (covDesde.isAfter(periodoDesde)) {
            estado = DisponibilidadMetrica.PARCIAL;
            advertencia = "Datos disponibles desde " + covDesde.format(FMT_COBERTURA);
        } else {
            estado = DisponibilidadMetrica.COMPLETA;
            advertencia = null;
        }
        return new EstadisticasDashboardDTO.DisponibilidadDespacho(estado, covDesde, covHasta, advertencia);
    }

    private static LocalDateTime toLocalDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime ldt) return ldt;
        if (value instanceof java.sql.Timestamp ts) return ts.toLocalDateTime();
        if (value instanceof java.time.Instant ins) return LocalDateTime.ofInstant(ins, ZONA_ECUADOR);
        return null;
    }

    /**
     * Construye una serie con todos los puntos del rango inicializados en cero,
     * para no agrupar localmente datos incompletos: los huecos se muestran como
     * observaciones nulas explícitas.
     */
    private static List<EstadisticasDashboardDTO.SeriePunto> buildSerie(
            GranularidadEstadisticas granularidad, LocalDate desde, LocalDate hastaExclusivo,
            List<Object[]> filas, boolean conPeso) {
        Map<String, EstadisticasDashboardDTO.SeriePunto> puntos = new LinkedHashMap<>();
        for (LocalDate inicio = truncar(desde, granularidad);
             inicio.isBefore(hastaExclusivo);
             inicio = siguiente(inicio, granularidad)) {
            String clave = clave(inicio, granularidad);
            puntos.put(clave, new EstadisticasDashboardDTO.SeriePunto(
                    clave, etiqueta(inicio, granularidad), 0, 0, BigDecimal.ZERO));
        }
        for (Object[] fila : filas) {
            LocalDate inicio = toLocalDate(fila[0]);
            String clave = clave(inicio, granularidad);
            long total = longValue(fila[1]);
            // Series de paquetes despachados: [periodo, total, peso]; total == paquetes.
            long paquetes = conPeso ? total : 0;
            BigDecimal peso = conPeso && fila.length > 2 ? decimal(fila[2]) : BigDecimal.ZERO;
            puntos.put(clave, new EstadisticasDashboardDTO.SeriePunto(
                    clave, etiqueta(inicio, granularidad), total, paquetes, peso));
        }
        return new ArrayList<>(puntos.values());
    }

    private static LocalDate truncar(LocalDate fecha, GranularidadEstadisticas g) {
        return switch (g) {
            case DIARIA -> fecha;
            case SEMANAL -> fecha.minusDays(fecha.getDayOfWeek().getValue() - 1L); // lunes ISO
            case MENSUAL -> fecha.withDayOfMonth(1);
            case TRIMESTRAL -> {
                int mesInicioTrim = ((fecha.getMonthValue() - 1) / 3) * 3 + 1;
                yield LocalDate.of(fecha.getYear(), mesInicioTrim, 1);
            }
        };
    }

    private static LocalDate siguiente(LocalDate inicio, GranularidadEstadisticas g) {
        return switch (g) {
            case DIARIA -> inicio.plusDays(1);
            case SEMANAL -> inicio.plusWeeks(1);
            case MENSUAL -> inicio.plusMonths(1);
            case TRIMESTRAL -> inicio.plusMonths(3);
        };
    }

    private static String clave(LocalDate inicio, GranularidadEstadisticas g) {
        return switch (g) {
            case DIARIA, SEMANAL -> inicio.toString(); // ISO yyyy-MM-dd (inicio de día/semana)
            case MENSUAL -> String.format("%04d-%02d", inicio.getYear(), inicio.getMonthValue());
            case TRIMESTRAL -> inicio.getYear() + "-Q" + inicio.get(IsoFields.QUARTER_OF_YEAR);
        };
    }

    private static String etiqueta(LocalDate inicio, GranularidadEstadisticas g) {
        return switch (g) {
            case DIARIA, SEMANAL -> ETIQUETA_DIA.format(inicio);
            case MENSUAL -> capitalizar(ETIQUETA_MES.format(inicio));
            case TRIMESTRAL -> "T" + inicio.get(IsoFields.QUARTER_OF_YEAR) + " "
                    + String.format("%02d", inicio.getYear() % 100);
        };
    }

    private static String capitalizar(String texto) {
        if (texto == null || texto.isEmpty()) return texto;
        return Character.toUpperCase(texto.charAt(0)) + texto.substring(1);
    }

    // ───────────────────────── Comparación ─────────────────────────

    private static MetricaComparable comparable(BigDecimal actual, BigDecimal anterior) {
        boolean hayAnterior = anterior != null;
        BigDecimal diferencia = (actual != null && hayAnterior) ? actual.subtract(anterior) : null;
        Double variacionPct = null;
        if (actual != null && hayAnterior && anterior.signum() != 0) {
            BigDecimal pct = actual.subtract(anterior)
                    .multiply(CIEN)
                    .divide(anterior.abs(), 4, RoundingMode.HALF_UP);
            variacionPct = Math.round(pct.doubleValue() * 10.0) / 10.0;
        }
        boolean comparacionDisponible = hayAnterior
                && !(anterior.signum() == 0 && (actual == null || actual.signum() == 0));
        return new MetricaComparable(actual, anterior, diferencia, variacionPct, comparacionDisponible);
    }

    private static BigDecimal redondearDias(Double valor) {
        if (valor == null) return null;
        return BigDecimal.valueOf(Math.round(valor * 10.0) / 10.0);
    }

    // ───────────────────────── Mapeos auxiliares ─────────────────────────

    private static EstadisticasDashboardDTO.PaqueteDemorado toDemorado(
            Paquete paquete, LocalDate hoy, int diasMax) {
        long dias = contarDiasLaborables(paquete.getCreatedAt().toLocalDate(), hoy);
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

    private static long contarDiasLaborables(LocalDate desde, LocalDate hasta) {
        long dias = 0;
        for (LocalDate fecha = desde.plusDays(1);
             !fecha.isAfter(hasta);
             fecha = fecha.plusDays(1)) {
            DayOfWeek dia = fecha.getDayOfWeek();
            if (dia != DayOfWeek.SATURDAY && dia != DayOfWeek.SUNDAY) {
                dias++;
            }
        }
        return dias;
    }

    private static EstadisticasDashboardDTO.PaqueteInconsistente toInconsistente(Paquete paquete) {
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
                string(row[0]), string(row[1]), string(row[2]), nullableLong(row[3]),
                string(row[4]), string(row[5]), string(row[6]), string(row[7]), string(row[8]));
    }

    private static LocalDate toLocalDate(Object value) {
        if (value instanceof Timestamp timestamp) {
            return timestamp.toLocalDateTime().toLocalDate();
        }
        if (value instanceof LocalDateTime dateTime) {
            return dateTime.toLocalDate();
        }
        if (value instanceof java.sql.Date date) {
            return date.toLocalDate();
        }
        if (value instanceof LocalDate date) {
            return date;
        }
        return LocalDate.parse(String.valueOf(value).substring(0, 10));
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
        return decimal(pesoLbs).multiply(decimal(tasaPorLibra)).setScale(4, RoundingMode.HALF_UP);
    }

    private static Long nullableLong(Object value) {
        return value instanceof Number number ? number.longValue() : null;
    }

    private static String string(Object value) {
        return value != null ? value.toString() : null;
    }
}
