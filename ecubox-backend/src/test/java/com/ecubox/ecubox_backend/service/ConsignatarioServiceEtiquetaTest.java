package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ConsignatarioDTO;
import com.ecubox.ecubox_backend.dto.ConsignatarioRequest;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Etiqueta organizativa opcional del destinatario: normalización (trim/vacío→null),
 * persistencia en create/update, DTO, versionado y pertenencia.
 */
@ExtendWith(MockitoExtension.class)
class ConsignatarioServiceEtiquetaTest {

    @Mock private ConsignatarioRepository consignatarioRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private GuiaMasterRepository guiaMasterRepository;
    @Mock private PaqueteRepository paqueteRepository;
    @Mock private PaqueteService paqueteService;
    @Mock private ConsignatarioVersionService consignatarioVersionService;
    @Mock private CurrentUserService currentUserService;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;

    private ConsignatarioService service;

    @BeforeEach
    void setUp() {
        service = new ConsignatarioService(consignatarioRepository, usuarioRepository,
                guiaMasterRepository, paqueteRepository, paqueteService,
                consignatarioVersionService, currentUserService, codigoSecuenciaService);
        lenient().when(consignatarioRepository.save(any(Consignatario.class)))
                .thenAnswer(inv -> inv.getArgument(0));
        lenient().when(codigoSecuenciaService.nextCodigoConsignatario()).thenReturn("ECU-0001");
    }

    private ConsignatarioRequest req(String etiqueta) {
        return ConsignatarioRequest.builder()
                .nombre("María López").telefono("0991234567").direccion("Av. Siempre Viva")
                .provincia("Pichincha").canton("Quito").etiqueta(etiqueta).build();
    }

    private Consignatario propio(Long usuarioId, String etiqueta) {
        return Consignatario.builder()
                .id(1L).nombre("María").etiqueta(etiqueta)
                .usuario(Usuario.builder().id(usuarioId).build())
                .build();
    }

    @Test
    void create_guardaEtiquetaRecortada() {
        ConsignatarioDTO dto = service.createByOperario(req("  Oficina  "));
        ArgumentCaptor<Consignatario> captor = ArgumentCaptor.forClass(Consignatario.class);
        verify(consignatarioRepository).save(captor.capture());
        assertEquals("Oficina", captor.getValue().getEtiqueta());
        assertEquals("Oficina", dto.getEtiqueta());
        // El versionado se dispara (la versión también captura la etiqueta).
        verify(consignatarioVersionService).crearNuevaVersion(any(Consignatario.class), any());
    }

    @Test
    void create_etiquetaVaciaQuedaNull() {
        service.createByOperario(req("   "));
        ArgumentCaptor<Consignatario> captor = ArgumentCaptor.forClass(Consignatario.class);
        verify(consignatarioRepository).save(captor.capture());
        assertNull(captor.getValue().getEtiqueta());
    }

    @Test
    void create_etiquetaNullQuedaNull() {
        service.createByOperario(req(null));
        ArgumentCaptor<Consignatario> captor = ArgumentCaptor.forClass(Consignatario.class);
        verify(consignatarioRepository).save(captor.capture());
        assertNull(captor.getValue().getEtiqueta());
    }

    @Test
    void update_estableceEtiqueta() {
        when(consignatarioRepository.findById(1L)).thenReturn(Optional.of(propio(7L, null)));
        ConsignatarioDTO dto = service.update(7L, 1L, false, req("Regalos"));
        assertEquals("Regalos", dto.getEtiqueta());
        verify(consignatarioVersionService).crearNuevaVersion(any(Consignatario.class), any());
    }

    @Test
    void update_borraEtiqueta() {
        when(consignatarioRepository.findById(1L)).thenReturn(Optional.of(propio(7L, "Trabajo")));
        ConsignatarioDTO dto = service.update(7L, 1L, false, req("   "));
        assertNull(dto.getEtiqueta());
    }

    @Test
    void update_destinatarioAjeno_404() {
        when(consignatarioRepository.findById(1L)).thenReturn(Optional.of(propio(7L, null)));
        assertThrows(ResourceNotFoundException.class, () -> service.update(99L, 1L, false, req("Oficina")));
        verify(consignatarioRepository, never()).save(any());
    }
}
