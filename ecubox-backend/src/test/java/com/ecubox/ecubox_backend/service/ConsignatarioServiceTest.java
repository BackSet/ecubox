package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.ConsignatarioRequest;
import com.ecubox.ecubox_backend.entity.Consignatario;
import com.ecubox.ecubox_backend.entity.Rol;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.exception.BadRequestException;
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

import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ConsignatarioServiceTest {

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
        service = new ConsignatarioService(
                consignatarioRepository,
                usuarioRepository,
                guiaMasterRepository,
                paqueteRepository,
                paqueteService,
                consignatarioVersionService,
                currentUserService,
                codigoSecuenciaService);
        lenient().when(codigoSecuenciaService.nextCodigoConsignatario()).thenReturn("ECU-10031");
        lenient().when(consignatarioRepository.save(any(Consignatario.class)))
                .thenAnswer(invocation -> {
                    Consignatario consignatario = invocation.getArgument(0);
                    consignatario.setId(31L);
                    return consignatario;
                });
    }

    @Test
    void create_desdeAdminDejaConsignatarioSinCliente() {
        Usuario admin = usuario(1L, "admin", "ADMIN", "CLIENTE");
        when(usuarioRepository.findByIdWithRoles(1L)).thenReturn(Optional.of(admin));

        var creado = service.create(1L, request(null));

        assertNull(creado.getClienteUsuarioId());
        assertNull(creado.getClienteUsuarioNombre());
        verify(consignatarioRepository).save(any(Consignatario.class));
    }

    @Test
    void createByOperario_rechazaAdminAunqueTambienTengaRolCliente() {
        Usuario admin = usuario(1L, "admin", "ADMIN", "CLIENTE");
        when(usuarioRepository.findByIdWithRoles(1L)).thenReturn(Optional.of(admin));

        BadRequestException error = assertThrows(
                BadRequestException.class,
                () -> service.createByOperario(request(1L)));

        assertEquals("El usuario seleccionado no es un cliente asignable.", error.getMessage());
        verify(consignatarioRepository, never()).save(any());
    }

    @Test
    void createByOperario_permiteClienteSinRolesInternos() {
        Usuario cliente = usuario(7L, "cliente-real", "CLIENTE");
        when(usuarioRepository.findByIdWithRoles(7L)).thenReturn(Optional.of(cliente));

        var creado = service.createByOperario(request(7L));

        assertEquals(7L, creado.getClienteUsuarioId());
        assertEquals("cliente-real", creado.getClienteUsuarioNombre());
    }

    private ConsignatarioRequest request(Long clienteUsuarioId) {
        return ConsignatarioRequest.builder()
                .nombre("Milton Pino")
                .telefono("0999999999")
                .direccion("Guayaquil")
                .provincia("Guayas")
                .canton("Guayaquil")
                .clienteUsuarioId(clienteUsuarioId)
                .build();
    }

    private Usuario usuario(Long id, String username, String... roles) {
        Set<Rol> rolesUsuario = java.util.Arrays.stream(roles)
                .map(nombre -> Rol.builder().nombre(nombre).build())
                .collect(java.util.stream.Collectors.toSet());
        return Usuario.builder()
                .id(id)
                .username(username)
                .roles(rolesUsuario)
                .build();
    }
}
