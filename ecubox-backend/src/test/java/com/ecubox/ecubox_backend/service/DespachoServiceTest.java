package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.DespachoResumenDTO;
import com.ecubox.ecubox_backend.enums.TipoEntrega;
import com.ecubox.ecubox_backend.repository.AgenciaRepository;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.CourierEntregaRepository;
import com.ecubox.ecubox_backend.repository.DespachoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * Regresión del resumen liviano de despachos: KPIs del universo + conteos por
 * tipo (que respetan courier/período) + opciones de filtro.
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class DespachoServiceTest {

    @Mock private DespachoRepository despachoRepository;
    @Mock private CourierEntregaRepository courierEntregaRepository;
    @Mock private ConsignatarioRepository consignatarioRepository;
    @Mock private AgenciaRepository agenciaRepository;
    @Mock private SacaRepository sacaRepository;
    @Mock private SacaService sacaService;
    @Mock private CurrentUserService currentUserService;
    @Mock private PaqueteService paqueteService;
    @Mock private PaqueteRepository paqueteRepository;
    @Mock private ParametroSistemaService parametroSistemaService;
    @Mock private AgenciaCourierEntregaService agenciaCourierEntregaService;
    @Mock private SacaEnDespachoValidator sacaEnDespachoValidator;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private GuiaMasterService guiaMasterService;
    @Mock private ConsignatarioVersionService consignatarioVersionService;
    @Mock private AgenciaVersionService agenciaVersionService;
    @Mock private AgenciaCourierEntregaVersionService agenciaCourierEntregaVersionService;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;

    private DespachoService createService() {
        return new DespachoService(
                despachoRepository, courierEntregaRepository, consignatarioRepository,
                agenciaRepository, sacaRepository, sacaService, currentUserService,
                paqueteService, paqueteRepository, parametroSistemaService,
                agenciaCourierEntregaService, sacaEnDespachoValidator, estadoRastreoService,
                guiaMasterService, consignatarioVersionService, agenciaVersionService,
                agenciaCourierEntregaVersionService, codigoSecuenciaService);
    }

    @Test
    @SuppressWarnings("unchecked")
    void resumen_agregaKpisYConteosPorTipo() {
        when(despachoRepository.count()).thenReturn(10L);
        when(despachoRepository.count(any(Specification.class))).thenReturn(4L);
        when(despachoRepository.countByFechaHoraEntre(any(), any())).thenReturn(2L);
        when(despachoRepository.countSacasEnDespachos()).thenReturn(5L);
        when(despachoRepository.countDistinctCouriers()).thenReturn(3L);
        when(despachoRepository.findDistinctCouriers()).thenReturn(List.of("DHL", "Servientrega"));
        when(despachoRepository.findDistinctTipos())
                .thenReturn(List.of(TipoEntrega.DOMICILIO, TipoEntrega.AGENCIA));

        DespachoResumenDTO resumen = createService().resumen(null, null, null);

        assertEquals(10L, resumen.getTotal());
        assertEquals(2L, resumen.getHoy());
        assertEquals(2L, resumen.getUltimos7d());
        assertEquals(5L, resumen.getSacas());
        assertEquals(3L, resumen.getCouriersEntrega());
        assertEquals(4L, resumen.getTipoCountsTotal());
        // Todos los tipos del enum aparecen en el mapa de conteos.
        assertEquals(TipoEntrega.values().length, resumen.getTipoCounts().size());
        assertTrue(resumen.getTipoCounts().containsKey(TipoEntrega.DOMICILIO));
        assertEquals(List.of("DHL", "Servientrega"), resumen.getCouriers());
        assertEquals(List.of(TipoEntrega.DOMICILIO, TipoEntrega.AGENCIA), resumen.getTipos());
    }
}
