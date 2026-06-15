package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ConsignatarioDTO;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.GuiaMasterRepository;
import com.ecubox.ecubox_backend.repository.PaqueteRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import com.ecubox.ecubox_backend.security.CurrentUserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

/**
 * Verifica que "Mis destinatarios" rellena los conteos de envíos por proyección
 * agrupada (sin descargar los datasets) y que un destinatario sin envíos reporta
 * cero en vez de quedar nulo.
 */
@ExtendWith(MockitoExtension.class)
class ConsignatarioServiceConteosTest {

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
    }

    @Test
    void findAllByUsuarioId_rellenaConteosPorProyeccion() {
        when(consignatarioRepository.findByUsuarioIdOrderByNombre(1L)).thenReturn(List.of(
                Consignatario.builder().id(5L).nombre("María").build(),
                Consignatario.builder().id(6L).nombre("Oficina principal").build()));
        // c5: 3 guías / 7 paquetes; c6: sin guías, 2 paquetes.
        when(guiaMasterRepository.countByConsignatarioIdInAgrupado(anyCollection())).thenReturn(List.<Object[]>of(
                new Object[]{5L, 3L}));
        when(paqueteRepository.countByConsignatarioIdInAgrupado(anyCollection())).thenReturn(List.<Object[]>of(
                new Object[]{5L, 7L}, new Object[]{6L, 2L}));

        Map<Long, ConsignatarioDTO> porId = service.findAllByUsuarioId(1L).stream()
                .collect(Collectors.toMap(ConsignatarioDTO::getId, d -> d));

        assertEquals(3L, porId.get(5L).getTotalGuias());
        assertEquals(7L, porId.get(5L).getTotalPaquetes());
        // Sin guías => cero real, no nulo.
        assertEquals(0L, porId.get(6L).getTotalGuias());
        assertEquals(2L, porId.get(6L).getTotalPaquetes());
    }
}
