package com.ecubox.ecubox_backend.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Conversión de peso lbs ↔ kg (mismas constantes que el frontend).
 */
public final class WeightUtil {

    /** 1 lb = 0.45359237 kg */
    public static final BigDecimal LBS_TO_KG = new BigDecimal("0.45359237");

    /** 1 kg ≈ 2.20462262185 lbs */
    public static final BigDecimal KG_TO_LBS = new BigDecimal("2.20462262185");

    private static final int SCALE = 4;

    private WeightUtil() {}

    public static BigDecimal lbsToKg(BigDecimal lbs) {
        if (lbs == null) return null;
        return lbs.multiply(LBS_TO_KG).setScale(SCALE, RoundingMode.HALF_UP);
    }

    public static BigDecimal kgToLbs(BigDecimal kg) {
        if (kg == null) return null;
        return kg.multiply(KG_TO_LBS).setScale(SCALE, RoundingMode.HALF_UP);
    }
}
