package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.ConsignatarioVersion;
import com.ecubox.ecubox_backend.repository.ConsignatarioVersionRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/** El historial SCD2 versiona la etiqueta como un dato editable más. */
@ExtendWith(MockitoExtension.class)
class ConsignatarioVersionServiceEtiquetaTest {

    @Mock private ConsignatarioVersionRepository versionRepository;
    @Mock private UsuarioRepository usuarioRepository;

    private ConsignatarioVersionService service;

    @BeforeEach
    void setUp() {
        service = new ConsignatarioVersionService(versionRepository, usuarioRepository);
        lenient().when(versionRepository.save(any(ConsignatarioVersion.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Consignatario maestro(String etiqueta) {
        return Consignatario.builder()
                .id(1L).nombre("María").telefono("099").direccion("Av").provincia("P").canton("Q")
                .codigo("ECU-1").etiqueta(etiqueta).build();
    }

    @Test
    void crearNuevaVersion_capturaEtiqueta() {
        when(versionRepository.findFirstByConsignatarioIdAndValidToIsNull(1L)).thenReturn(Optional.empty());
        service.crearNuevaVersion(maestro("Oficina"), null);
        ArgumentCaptor<ConsignatarioVersion> captor = ArgumentCaptor.forClass(ConsignatarioVersion.class);
        verify(versionRepository).save(captor.capture());
        assertEquals("Oficina", captor.getValue().getEtiqueta());
    }

    @Test
    void cambiarSoloEtiqueta_creaNuevaVersion() {
        ConsignatarioVersion vigente = ConsignatarioVersion.builder()
                .nombre("María").telefono("099").direccion("Av").provincia("P").canton("Q")
                .codigo("ECU-1").etiqueta("Trabajo").validFrom(LocalDateTime.now()).build();
        when(versionRepository.findFirstByConsignatarioIdAndValidToIsNull(1L)).thenReturn(Optional.of(vigente));

        service.crearNuevaVersion(maestro("Regalos"), null);

        ArgumentCaptor<ConsignatarioVersion> captor = ArgumentCaptor.forClass(ConsignatarioVersion.class);
        // Se cierra la vigente y se abre una nueva (2 saves); la nueva trae "Regalos".
        verify(versionRepository, times(2)).save(captor.capture());
        assertEquals("Regalos", captor.getAllValues().get(captor.getAllValues().size() - 1).getEtiqueta());
    }
}
