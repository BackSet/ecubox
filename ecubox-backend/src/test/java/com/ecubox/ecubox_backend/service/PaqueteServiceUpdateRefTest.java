package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.PaqueteDTO;
import com.ecubox.ecubox_backend.dto.PaqueteUpdateRequest;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.LoteRecepcionGuiaRepository;
import com.ecubox.ecubox_backend.repository.OutboxEventRepository;
import com.ecubox.ecubox_backend.repository.PaqueteEstadoEventoRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.SacaRepository;
import com.ecubox.ecubox_backend.service.validation.OwnershipValidator;
import com.ecubox.ecubox_backend.service.validation.SacaEnDespachoValidator;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Verifica que {@link PaqueteService#update} mantenga consistente la
 * relacion {@code ref <-> destinatario}:
 *
 * - Cuando cambia el destinatario, el ref se regenera con el codigoBase
 *   del nuevo destinatario y un eventual {@code request.ref} viejo NO
 *   debe sobreescribirlo (bug pre-V69 que dejaba destId KEVIN con ref
 *   "ECU-CV01-...").
 * - Cuando NO cambia el destinatario y llega {@code request.ref}, debe
 *   validarse que el prefijo coincida con el codigoBase del destinatario
 *   actual; si no, lanzar {@link BadRequestException}.
 */
@ExtendWith(MockitoExtension.class)
class PaqueteServiceUpdateRefTest {

    @Mock private PaqueteRepository paqueteRepository;
    @Mock private ConsignatarioRepository consignatarioRepository;
    @Mock private SacaRepository sacaRepository;
    @Mock private LoteRecepcionGuiaRepository loteRecepcionGuiaRepository;
    @Mock private PaqueteEstadoEventoRepository paqueteEstadoEventoRepository;
    @Mock private OutboxEventRepository outboxEventRepository;
    @Mock private ParametroSistemaService parametroSistemaService;
    @Mock private EstadoRastreoService estadoRastreoService;
    @Mock private TrackingEventService trackingEventService;
    @Mock private GuiaMasterRepository guiaMasterRepository;
    @Mock private GuiaMasterService guiaMasterService;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;

    private PaqueteService createService() {
        return new PaqueteService(
                paqueteRepository,
                consignatarioRepository,
                sacaRepository,
                loteRecepcionGuiaRepository,
                paqueteEstadoEventoRepository,
                outboxEventRepository,
                parametroSistemaService,
                estadoRastreoService,
                trackingEventService,
                guiaMasterRepository,
                guiaMasterService,
                new OwnershipValidator(),
                new SacaEnDespachoValidator(),
                codigoSecuenciaService,
                false);
    }

    private static Paquete paqueteCon(Consignatario dest, String ref) {
        return Paquete.builder()
                .id(101L)
                .consignatario(dest)
                .ref(ref)
                .contenido("contenido valido")
                .pesoLbs(BigDecimal.valueOf(2.5))
                .build();
    }

    @Test
    void update_cambioDeDestinatario_ignoraRequestRefViejo_yRegeneraConNuevoCodigoBase() {
        PaqueteService service = createService();
        Usuario owner = Usuario.builder().id(1L).build();
        Consignatario cristina = Consignatario.builder()
                .id(18L).codigo("ECU-CV01").usuario(owner).build();
        Consignatario kevin = Consignatario.builder()
                .id(20L).codigo("ECU-KZ66").usuario(owner).build();
        Paquete paquete = paqueteCon(cristina, "ECU-CV01-17");

        when(paqueteRepository.findById(101L)).thenReturn(Optional.of(paquete));
        when(consignatarioRepository.findById(20L)).thenReturn(Optional.of(kevin));
        when(codigoSecuenciaService.nextRefPaquete(20L, "ECU-KZ66")).thenReturn("ECU-KZ66-1");
        when(paqueteRepository.save(any(Paquete.class))).thenAnswer(inv -> inv.getArgument(0));

        // El frontend reenvia el ref viejo del paquete (bug clasico).
        PaqueteUpdateRequest req = PaqueteUpdateRequest.builder()
                .consignatarioId(20L)
                .contenido("contenido valido")
                .ref("ECU-CV01-17")
                .build();

        PaqueteDTO dto = service.update(101L, 1L, true, true, req);

        ArgumentCaptor<Paquete> captor = ArgumentCaptor.forClass(Paquete.class);
        verify(paqueteRepository).save(captor.capture());
        Paquete saved = captor.getValue();
        assertThat(saved.getConsignatario().getId()).isEqualTo(20L);
        assertThat(saved.getRef())
                .as("ref debe quedar con el codigoBase del nuevo destinatario, no el viejo")
                .isEqualTo("ECU-KZ66-1");
        assertThat(dto.getRef()).isEqualTo("ECU-KZ66-1");
        // No debe consultarse duplicado para el ref viejo: simplemente lo ignoramos.
        verify(paqueteRepository, never()).existsByRefAndIdNot(any(), any());
    }

    @Test
    void update_sinCambioDeDestinatario_aceptaRequestRefConPrefijoCorrecto() {
        PaqueteService service = createService();
        Usuario owner = Usuario.builder().id(1L).build();
        Consignatario kevin = Consignatario.builder()
                .id(20L).codigo("ECU-KZ66").usuario(owner).build();
        Paquete paquete = paqueteCon(kevin, "ECU-KZ66-1");

        when(paqueteRepository.findById(101L)).thenReturn(Optional.of(paquete));
        when(paqueteRepository.existsByRefAndIdNot("ECU-KZ66-7", 101L)).thenReturn(false);
        when(paqueteRepository.save(any(Paquete.class))).thenAnswer(inv -> inv.getArgument(0));

        PaqueteUpdateRequest req = PaqueteUpdateRequest.builder()
                .consignatarioId(20L)
                .contenido("contenido valido")
                .ref("ECU-KZ66-7")
                .build();

        PaqueteDTO dto = service.update(101L, 1L, true, true, req);

        assertThat(dto.getRef()).isEqualTo("ECU-KZ66-7");
        // No se debio invocar la secuencia atomica: no cambio el destinatario.
        verify(codigoSecuenciaService, never()).nextRefPaquete(any(), any());
    }

    @Test
    void update_sinCambioDeDestinatario_rechazaRequestRefConPrefijoIncorrecto() {
        PaqueteService service = createService();
        Usuario owner = Usuario.builder().id(1L).build();
        Consignatario kevin = Consignatario.builder()
                .id(20L).codigo("ECU-KZ66").usuario(owner).build();
        Paquete paquete = paqueteCon(kevin, "ECU-KZ66-1");

        when(paqueteRepository.findById(101L)).thenReturn(Optional.of(paquete));

        PaqueteUpdateRequest req = PaqueteUpdateRequest.builder()
                .consignatarioId(20L)
                .contenido("contenido valido")
                .ref("ECU-CV01-17")
                .build();

        assertThatThrownBy(() -> service.update(101L, 1L, true, true, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("ECU-KZ66");

        verify(paqueteRepository, never()).save(any());
    }
}
