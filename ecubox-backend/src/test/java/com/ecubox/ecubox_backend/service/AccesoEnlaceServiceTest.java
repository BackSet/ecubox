package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.AccesoEnlaceDTO;
import com.ecubox.ecubox_backend.dto.GenerarAccesoEnlaceRequest;
import com.ecubox.ecubox_backend.dto.GenerarAccesoEnlaceResponse;
import com.ecubox.ecubox_backend.entity.AccesoEnlace;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.TipoAccesoEnlace;
import com.ecubox.ecubox_backend.repository.AccesoEnlaceRepository;
import com.ecubox.ecubox_backend.repository.ConsignatarioRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AccesoEnlaceServiceTest {

    @Mock private AccesoEnlaceRepository enlaceRepository;
    @Mock private ConsignatarioRepository consignatarioRepository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;

    private AccesoEnlaceService service;

    @BeforeEach
    void setUp() {
        service = new AccesoEnlaceService(
                enlaceRepository, consignatarioRepository, usuarioRepository, codigoSecuenciaService);
        lenient().when(enlaceRepository.save(any(AccesoEnlace.class)))
                .thenAnswer(inv -> inv.getArgument(0));
    }

    private Consignatario consignatario(Long id) {
        return Consignatario.builder().id(id).nombre("Cliente " + id).codigo("ECU-000" + id).build();
    }

    private GenerarAccesoEnlaceRequest request(TipoAccesoEnlace tipo, Integer horas) {
        GenerarAccesoEnlaceRequest req = new GenerarAccesoEnlaceRequest();
        req.setTipo(tipo);
        req.setConsignatarioIds(List.of(1L));
        req.setDuracionHoras(horas);
        req.setEtiqueta("Etiqueta");
        return req;
    }

    @Test
    void generar_persistente_asignaCodigo() {
        when(consignatarioRepository.findAllById(List.of(1L))).thenReturn(List.of(consignatario(1L)));
        when(codigoSecuenciaService.nextCodigoAccesoEnlace()).thenReturn("ACC-000001");

        GenerarAccesoEnlaceResponse res = service.generar(request(TipoAccesoEnlace.PERSISTENTE, null), null);

        assertEquals("ACC-000001", res.getEnlace().getCodigo());
        assertNotNull(res.getToken());
    }

    @Test
    void generar_temporal_asignaCodigo() {
        when(consignatarioRepository.findAllById(List.of(1L))).thenReturn(List.of(consignatario(1L)));
        when(codigoSecuenciaService.nextCodigoAccesoEnlace()).thenReturn("ACC-000042");

        GenerarAccesoEnlaceResponse res = service.generar(request(TipoAccesoEnlace.TEMPORAL, 24), null);

        assertEquals("ACC-000042", res.getEnlace().getCodigo());
    }

    @Test
    void generar_dosEnlaces_recibenCodigosDistintos() {
        when(consignatarioRepository.findAllById(List.of(1L))).thenReturn(List.of(consignatario(1L)));
        when(codigoSecuenciaService.nextCodigoAccesoEnlace())
                .thenReturn("ACC-000001", "ACC-000002");

        String c1 = service.generar(request(TipoAccesoEnlace.PERSISTENTE, null), null).getEnlace().getCodigo();
        String c2 = service.generar(request(TipoAccesoEnlace.PERSISTENTE, null), null).getEnlace().getCodigo();

        assertNotEquals(c1, c2);
    }

    @Test
    void listar_incluyeCodigo() {
        AccesoEnlace enlace = AccesoEnlace.builder()
                .id(7L).codigo("ACC-000007").tokenHash("h").token("t")
                .tipo(TipoAccesoEnlace.PERSISTENTE).createdAt(LocalDateTime.now())
                .consignatarios(Set.of(consignatario(1L))).build();
        when(enlaceRepository.findActivosWithConsignatarios()).thenReturn(List.of(enlace));

        List<AccesoEnlaceDTO> dtos = service.listar();

        assertEquals(1, dtos.size());
        assertEquals("ACC-000007", dtos.get(0).getCodigo());
    }

    @Test
    void canjear_porToken_sigueFuncionando() {
        AccesoEnlace enlace = AccesoEnlace.builder()
                .id(7L).codigo("ACC-000007").tokenHash("h").token("t")
                .tipo(TipoAccesoEnlace.PERSISTENTE).createdAt(LocalDateTime.now())
                .consignatarios(Set.of(consignatario(1L))).build();
        when(enlaceRepository.findByTokenHashWithConsignatarios(anyString()))
                .thenReturn(Optional.of(enlace));

        AccesoEnlace resultado = service.canjear("token-en-claro");

        assertSame(enlace, resultado);
        assertNotNull(resultado.getUltimoAccesoAt());
    }

    @Test
    void revocar_sigueFuncionando() {
        AccesoEnlace enlace = AccesoEnlace.builder()
                .id(7L).codigo("ACC-000007").tokenHash("h").tipo(TipoAccesoEnlace.PERSISTENTE)
                .createdAt(LocalDateTime.now()).build();
        when(enlaceRepository.findById(7L)).thenReturn(Optional.of(enlace));

        service.revocar(7L);

        assertNotNull(enlace.getRevocadoAt());
        verify(enlaceRepository).save(enlace);
    }

    @Test
    void canjear_noRequiereCodigo_soloToken() {
        // El código es de presentación; el canje se resuelve únicamente por el hash del token.
        AccesoEnlace enlace = AccesoEnlace.builder()
                .id(7L).codigo("ACC-000007").tokenHash("h").token("t")
                .tipo(TipoAccesoEnlace.PERSISTENTE).createdAt(LocalDateTime.now())
                .consignatarios(Set.of(consignatario(1L))).build();
        when(enlaceRepository.findByTokenHashWithConsignatarios(anyString()))
                .thenReturn(Optional.of(enlace));

        assertSame(enlace, service.canjear("token"));
        // El canje se resuelve por el hash del token, nunca por el código.
        verify(enlaceRepository).findByTokenHashWithConsignatarios(anyString());
    }
}
