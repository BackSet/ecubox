package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.IniciarRevisionPaqueteRequest;
import com.ecubox.ecubox_backend.dto.ResolverRevisionPaqueteRequest;
import com.ecubox.ecubox_backend.entity.EstadoRastreo;
import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.entity.RevisionPaquete;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.EstadoRevisionPaquete;
import com.ecubox.ecubox_backend.enums.MotivoRevisionPaquete;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.RevisionPaqueteRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RevisionPaqueteServiceTest {

    @Mock private PaqueteRepository paqueteRepository;
    @Mock private RevisionPaqueteRepository revisionPaqueteRepository;

    private RevisionPaqueteService service;
    private Paquete paquete;
    private Usuario usuario;
    private EstadoRastreo estadoLogistico;

    @BeforeEach
    void setUp() {
        service = new RevisionPaqueteService(paqueteRepository, revisionPaqueteRepository);
        estadoLogistico = EstadoRastreo.builder().id(9L).codigo("EN_TRANSITO").build();
        paquete = Paquete.builder().id(4L).numeroGuia("GUIA-4").estadoRastreo(estadoLogistico).build();
        usuario = Usuario.builder().id(7L).username("operario").passwordHash("hash").build();
        when(paqueteRepository.findByIdForUpdate(4L)).thenReturn(Optional.of(paquete));
        when(revisionPaqueteRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            RevisionPaquete revision = invocation.getArgument(0);
            revision.setId(12L);
            revision.setVersion(0L);
            return revision;
        });
    }

    @Test
    void iniciar_creaRevisionSinCambiarEstadoLogistico() {
        IniciarRevisionPaqueteRequest request = request(MotivoRevisionPaquete.DATOS_INCONSISTENTES, "Validar datos");

        var result = service.iniciar(4L, request, usuario);

        assertEquals(EstadoRevisionPaquete.EN_REVISION, result.getEstado());
        assertEquals(MotivoRevisionPaquete.DATOS_INCONSISTENTES, result.getMotivo());
        assertSame(estadoLogistico, paquete.getEstadoRastreo());
    }

    @Test
    void iniciar_requiereMotivo() {
        IniciarRevisionPaqueteRequest request = new IniciarRevisionPaqueteRequest();
        assertThrows(BadRequestException.class, () -> service.iniciar(4L, request, usuario));
        verifyNoInteractions(paqueteRepository);
    }

    @Test
    void iniciar_otroRequiereObservacion() {
        IniciarRevisionPaqueteRequest request = request(MotivoRevisionPaquete.OTRO, "  ");
        assertThrows(BadRequestException.class, () -> service.iniciar(4L, request, usuario));
    }

    @Test
    void iniciar_rechazaSegundaRevisionActiva() {
        when(revisionPaqueteRepository.existsByPaqueteIdAndEstado(
                4L, EstadoRevisionPaquete.EN_REVISION)).thenReturn(true);

        assertThrows(ConflictException.class, () ->
                service.iniciar(4L, request(MotivoRevisionPaquete.GUIA_INCORRECTA, null), usuario));
        verify(revisionPaqueteRepository, never()).saveAndFlush(any());
    }

    @Test
    void resolver_cierraRevisionSinCambiarEstadoLogistico() {
        RevisionPaquete activa = activa();
        when(revisionPaqueteRepository.findActivaForUpdate(
                4L, EstadoRevisionPaquete.EN_REVISION)).thenReturn(Optional.of(activa));
        ResolverRevisionPaqueteRequest request = new ResolverRevisionPaqueteRequest();
        request.setObservacion("Corregido");

        var result = service.resolver(4L, request, usuario);

        assertEquals(EstadoRevisionPaquete.RESUELTA, result.getEstado());
        assertNotNull(result.getFechaResolucion());
        assertEquals("Corregido", result.getObservacionResolucion());
        assertSame(estadoLogistico, paquete.getEstadoRastreo());
    }

    @Test
    void historial_preservaMultiplesRevisiones() {
        RevisionPaquete primera = activa();
        RevisionPaquete segunda = activa();
        segunda.setId(13L);
        segunda.setEstado(EstadoRevisionPaquete.RESUELTA);
        when(paqueteRepository.existsById(4L)).thenReturn(true);
        when(revisionPaqueteRepository.findHistorial(4L)).thenReturn(List.of(segunda, primera));

        assertEquals(2, service.historial(4L).size());
    }

    private IniciarRevisionPaqueteRequest request(MotivoRevisionPaquete motivo, String observacion) {
        IniciarRevisionPaqueteRequest request = new IniciarRevisionPaqueteRequest();
        request.setMotivo(motivo);
        request.setObservacion(observacion);
        return request;
    }

    private RevisionPaquete activa() {
        return RevisionPaquete.builder()
                .id(12L)
                .paquete(paquete)
                .motivo(MotivoRevisionPaquete.DATOS_INCONSISTENTES)
                .estado(EstadoRevisionPaquete.EN_REVISION)
                .iniciadoPor(usuario)
                .version(0L)
                .build();
    }
}
