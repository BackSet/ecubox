package com.ecubox.ecubox_backend.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Agrega o actualiza una linea de la seccion A.
 *
 * <p>Para identificar el envio consolidado se admite (al agregar) cualquiera
 * de las dos formas:
 * <ul>
 *   <li>{@link #envioConsolidadoId}: id del consolidado existente.</li>
 *   <li>{@link #envioConsolidadoCodigo}: codigo (guia) del consolidado. Si no
 *       existe en el sistema, se crea automaticamente sin paquetes; si ya
 *       existe, se reutiliza la misma entidad.</li>
 * </ul>
 * En el PUT (actualizar) ambos se ignoran.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LiquidacionConsolidadoLineaRequest {

    /** Solo se usa al agregar (POST). En el PUT se ignora. */
    private Long envioConsolidadoId;

    /**
     * Codigo del envio consolidado (alternativa a {@link #envioConsolidadoId}).
     * Si no existe en el sistema, se crea automaticamente sin paquetes.
     */
    @Size(max = 100, message = "El codigo no puede superar 100 caracteres")
    private String envioConsolidadoCodigo;

    @NotNull(message = "El costo del proveedor es obligatorio")
    @DecimalMin(value = "0.0", message = "El costo del proveedor no puede ser negativo")
    private BigDecimal costoProveedor;

    @NotNull(message = "El ingreso del cliente es obligatorio")
    @DecimalMin(value = "0.0", message = "El ingreso del cliente no puede ser negativo")
    private BigDecimal ingresoCliente;

    @Size(max = 4000, message = "Las notas no pueden superar 4000 caracteres")
    private String notas;

    /**
     * Validacion semantica: al agregar (POST) debe venir id O codigo. La
     * actualizacion (PUT) no llama esta validacion porque ignora ambos
     * campos en el service.
     */
    @AssertTrue(message = "Debes indicar el consolidado por id o por codigo")
    public boolean isReferenciaConsolidadoValida() {
        boolean hasId = envioConsolidadoId != null && envioConsolidadoId > 0;
        boolean hasCodigo = envioConsolidadoCodigo != null
                && !envioConsolidadoCodigo.isBlank();
        return hasId || hasCodigo;
    }
}
