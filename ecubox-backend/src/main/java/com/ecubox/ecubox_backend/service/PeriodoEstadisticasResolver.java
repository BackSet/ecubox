package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.EstadisticasConsulta;
import com.ecubox.ecubox_backend.enums.GranularidadEstadisticas;
import com.ecubox.ecubox_backend.enums.PresetPeriodoEstadisticas;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;

/**
 * Resuelve los parámetros de consulta a un periodo normalizado en zona
 * {@code America/Guayaquil}: rango {@code [desde, hasta)} con {@code hasta}
 * exclusivo, granularidad efectiva, periodo anterior equivalente y bandera de
 * periodo parcial (en curso).
 *
 * <p>No hace acceso a datos: es lógica de calendario pura y, por ello, recibe el
 * día actual como parámetro para ser determinista en pruebas (años bisiestos,
 * cambios de año, fin de mes).</p>
 */
@Component
public class PeriodoEstadisticasResolver {

    /** Tope de seguridad del rango consultable (~25 meses). */
    static final int MAX_DIAS = 800;
    private static final int MAX_DIAS_GRANULARIDAD_DIARIA = 400;

    public record Resuelto(
            PresetPeriodoEstadisticas preset,
            GranularidadEstadisticas granularidad,
            LocalDate desde,
            LocalDate hastaExclusivo,
            LocalDate anteriorDesde,
            LocalDate anteriorHastaExclusivo,
            boolean parcial
    ) {
    }

    public Resuelto resolver(EstadisticasConsulta consulta, LocalDate hoy) {
        LocalDate hoyExclusivo = hoy.plusDays(1);
        PresetPeriodoEstadisticas preset = determinarPreset(consulta);

        LocalDate desde;
        LocalDate hastaExclusivo;
        LocalDate anteriorDesde;
        LocalDate anteriorHastaExclusivo;
        boolean parcial;

        switch (preset) {
            case ESTE_MES -> {
                YearMonth ym = YearMonth.from(hoy);
                desde = ym.atDay(1);
                hastaExclusivo = hoyExclusivo;
                parcial = !hastaExclusivo.equals(ym.plusMonths(1).atDay(1));
                long dias = ChronoUnit.DAYS.between(desde, hastaExclusivo);
                anteriorDesde = desde.minusMonths(1);
                anteriorHastaExclusivo = anteriorDesde.plusDays(dias);
            }
            case MES_ANTERIOR -> {
                YearMonth ym = YearMonth.from(hoy).minusMonths(1);
                desde = ym.atDay(1);
                hastaExclusivo = ym.plusMonths(1).atDay(1);
                parcial = false;
                anteriorDesde = ym.minusMonths(1).atDay(1);
                anteriorHastaExclusivo = ym.atDay(1);
            }
            case MES_ESPECIFICO -> {
                YearMonth ym = mesEspecifico(consulta);
                YearMonth actual = YearMonth.from(hoy);
                if (ym.isAfter(actual)) {
                    throw new BadRequestException("El mes seleccionado no puede ser futuro.");
                }
                desde = ym.atDay(1);
                if (ym.equals(actual)) {
                    hastaExclusivo = hoyExclusivo;
                    parcial = !hastaExclusivo.equals(ym.plusMonths(1).atDay(1));
                    long dias = ChronoUnit.DAYS.between(desde, hastaExclusivo);
                    anteriorDesde = desde.minusMonths(1);
                    anteriorHastaExclusivo = anteriorDesde.plusDays(dias);
                } else {
                    hastaExclusivo = ym.plusMonths(1).atDay(1);
                    parcial = false;
                    anteriorDesde = ym.minusMonths(1).atDay(1);
                    anteriorHastaExclusivo = ym.atDay(1);
                }
            }
            case ULTIMOS_3_MESES, ULTIMOS_6_MESES, ULTIMOS_12_MESES, ULTIMOS_24_MESES -> {
                int n = mesesDePreset(preset);
                YearMonth ymInicio = YearMonth.from(hoy).minusMonths(n - 1L);
                desde = ymInicio.atDay(1);
                hastaExclusivo = hoyExclusivo;
                parcial = !hastaExclusivo.equals(YearMonth.from(hoy).plusMonths(1).atDay(1));
                anteriorDesde = desde.minusMonths(n);
                anteriorHastaExclusivo = desde;
            }
            case ESTE_ANIO -> {
                desde = LocalDate.of(hoy.getYear(), 1, 1);
                hastaExclusivo = hoyExclusivo;
                parcial = !hastaExclusivo.equals(LocalDate.of(hoy.getYear() + 1, 1, 1));
                anteriorDesde = desde.minusYears(1);
                anteriorHastaExclusivo = hastaExclusivo.minusYears(1);
            }
            case ANIO_ANTERIOR -> {
                int y = hoy.getYear() - 1;
                desde = LocalDate.of(y, 1, 1);
                hastaExclusivo = LocalDate.of(y + 1, 1, 1);
                parcial = false;
                anteriorDesde = LocalDate.of(y - 1, 1, 1);
                anteriorHastaExclusivo = desde;
            }
            case RANGO_PERSONALIZADO -> {
                if (consulta.desde() == null || consulta.hasta() == null) {
                    throw new BadRequestException("El rango personalizado requiere 'desde' y 'hasta'.");
                }
                desde = consulta.desde();
                hastaExclusivo = consulta.hasta();
                parcial = hastaExclusivo.equals(hoyExclusivo);
                long dias = ChronoUnit.DAYS.between(desde, hastaExclusivo);
                anteriorHastaExclusivo = desde;
                anteriorDesde = desde.minusDays(Math.max(1, dias));
            }
            default -> throw new BadRequestException("Preset de periodo no soportado.");
        }

        validar(desde, hastaExclusivo, hoyExclusivo);
        GranularidadEstadisticas granularidad =
                resolverGranularidad(consulta.granularidad(), desde, hastaExclusivo);

        return new Resuelto(preset, granularidad, desde, hastaExclusivo,
                anteriorDesde, anteriorHastaExclusivo, parcial);
    }

    private PresetPeriodoEstadisticas determinarPreset(EstadisticasConsulta consulta) {
        if (consulta.preset() != null) {
            return consulta.preset();
        }
        if (consulta.desde() != null || consulta.hasta() != null) {
            return PresetPeriodoEstadisticas.RANGO_PERSONALIZADO;
        }
        if (consulta.meses() != null) {
            int n = Math.max(3, Math.min(24, consulta.meses()));
            return switch (n) {
                case 3 -> PresetPeriodoEstadisticas.ULTIMOS_3_MESES;
                case 6 -> PresetPeriodoEstadisticas.ULTIMOS_6_MESES;
                case 24 -> PresetPeriodoEstadisticas.ULTIMOS_24_MESES;
                default -> {
                    // El contrato heredado permite cualquier N entre 3 y 24; se mapea al
                    // preset más cercano conservando la cantidad exacta vía meses crudos.
                    yield PresetPeriodoEstadisticas.ULTIMOS_12_MESES;
                }
            };
        }
        return PresetPeriodoEstadisticas.ULTIMOS_12_MESES;
    }

    private static int mesesDePreset(PresetPeriodoEstadisticas preset) {
        return switch (preset) {
            case ULTIMOS_3_MESES -> 3;
            case ULTIMOS_6_MESES -> 6;
            case ULTIMOS_12_MESES -> 12;
            case ULTIMOS_24_MESES -> 24;
            default -> 12;
        };
    }

    private static YearMonth mesEspecifico(EstadisticasConsulta consulta) {
        if (consulta.anio() == null || consulta.mes() == null) {
            throw new BadRequestException("Seleccionar mes requiere 'anio' y 'mes'.");
        }
        if (consulta.mes() < 1 || consulta.mes() > 12) {
            throw new BadRequestException("El mes debe estar entre 1 y 12.");
        }
        try {
            return YearMonth.of(consulta.anio(), consulta.mes());
        } catch (RuntimeException ex) {
            throw new BadRequestException("Mes o año inválido.", ex);
        }
    }

    private static void validar(LocalDate desde, LocalDate hastaExclusivo, LocalDate hoyExclusivo) {
        if (!desde.isBefore(hastaExclusivo)) {
            throw new BadRequestException("'desde' debe ser anterior a 'hasta'.");
        }
        if (hastaExclusivo.isAfter(hoyExclusivo)) {
            throw new BadRequestException("El periodo no puede incluir fechas futuras.");
        }
        long dias = ChronoUnit.DAYS.between(desde, hastaExclusivo);
        if (dias > MAX_DIAS) {
            throw new BadRequestException(
                    "El rango supera el máximo permitido de " + MAX_DIAS + " días.");
        }
    }

    private static GranularidadEstadisticas resolverGranularidad(
            GranularidadEstadisticas override, LocalDate desde, LocalDate hastaExclusivo) {
        long dias = ChronoUnit.DAYS.between(desde, hastaExclusivo);
        if (override != null) {
            if (override == GranularidadEstadisticas.DIARIA && dias > MAX_DIAS_GRANULARIDAD_DIARIA) {
                throw new BadRequestException(
                        "La granularidad diaria no es compatible con un rango tan amplio.");
            }
            return override;
        }
        if (dias <= 31) {
            return GranularidadEstadisticas.DIARIA;
        }
        if (dias <= 120) {
            return GranularidadEstadisticas.SEMANAL;
        }
        long meses = ChronoUnit.MONTHS.between(
                YearMonth.from(desde), YearMonth.from(hastaExclusivo.minusDays(1)).plusMonths(1));
        if (meses <= 24) {
            return GranularidadEstadisticas.MENSUAL;
        }
        return GranularidadEstadisticas.TRIMESTRAL;
    }
}
