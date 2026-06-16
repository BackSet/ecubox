package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.CampaniaLandingDTO;
import com.ecubox.ecubox_backend.dto.CampaniaLandingPublicDTO;
import com.ecubox.ecubox_backend.dto.CampaniaLandingRequest;
import com.ecubox.ecubox_backend.entity.CampaniaLanding;
import com.ecubox.ecubox_backend.enums.EstadoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoDestinoCta;
import com.ecubox.ecubox_backend.enums.VigenciaCampaniaLanding;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.repository.CampaniaLandingRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CampaniaLandingServiceTest {

    @Mock private CampaniaLandingRepository repository;
    @Mock private UsuarioRepository usuarioRepository;
    @Mock private CodigoSecuenciaService codigoSecuenciaService;

    private CampaniaLandingService service;

    @BeforeEach
    void setUp() {
        service = new CampaniaLandingService(repository, usuarioRepository, codigoSecuenciaService);
        lenient().when(repository.save(any(CampaniaLanding.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(repository.saveAndFlush(any(CampaniaLanding.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private CampaniaLandingRequest baseRequest() {
        return CampaniaLandingRequest.builder()
                .nombreInterno("Promo verano")
                .tipo(TipoCampaniaLanding.OFERTA)
                .titulo("Envíos con descuento")
                .build();
    }

    private CampaniaLanding entidad(Long id, EstadoCampaniaLanding estado) {
        return CampaniaLanding.builder()
                .id(id).codigo("CAM-00000" + id).nombreInterno("c" + id)
                .estado(estado).tipo(TipoCampaniaLanding.OFERTA).titulo("t" + id)
                .creadaAt(LocalDateTime.now()).actualizadaAt(LocalDateTime.now()).version(0L)
                .build();
    }

    // --------------------------------------------------------------- crear

    @Test
    void crear_generaCodigoYQuedaEnBorrador() {
        when(codigoSecuenciaService.nextCodigoCampaniaLanding()).thenReturn("CAM-000001");
        CampaniaLandingDTO dto = service.crear(baseRequest(), 7L);
        assertEquals("CAM-000001", dto.getCodigo());
        assertEquals(EstadoCampaniaLanding.BORRADOR, dto.getEstado());
        assertEquals(7L, dto.getCreadaPor());
        assertNull(dto.getVigencia(), "borrador no tiene vigencia derivada");
    }

    @Test
    void crear_sinNombreInterno_falla() {
        CampaniaLandingRequest req = baseRequest();
        req.setNombreInterno("   ");
        when(codigoSecuenciaService.nextCodigoCampaniaLanding()).thenReturn("CAM-1");
        assertThrows(BadRequestException.class, () -> service.crear(req, 1L));
    }

    // ------------------------------------------------- validaciones (borrador)

    @Test
    void crear_borradorIncompleto_permitido() {
        // Sin título, con CTA parcial e imagen sin alt: un borrador puede guardarse así.
        CampaniaLandingRequest req = CampaniaLandingRequest.builder()
                .nombreInterno("Promo").tipo(TipoCampaniaLanding.OFERTA)
                .titulo(null).textoCta("Ver").imagenUrlClaro("https://cdn.x/a.png").build();
        when(codigoSecuenciaService.nextCodigoCampaniaLanding()).thenReturn("CAM-1");
        assertDoesNotThrow(() -> service.crear(req, 1L));
    }

    @Test
    void crear_bloqueaEsquemaPeligroso_siempre() {
        when(codigoSecuenciaService.nextCodigoCampaniaLanding()).thenReturn("CAM-1");
        CampaniaLandingRequest js = baseRequest();
        js.setUrlCta("javascript:alert(1)");
        assertThrows(BadRequestException.class, () -> service.crear(js, 1L));

        CampaniaLandingRequest dataImg = baseRequest();
        dataImg.setImagenUrlOscuro("data:image/png;base64,AAAA");
        assertThrows(BadRequestException.class, () -> service.crear(dataImg, 1L));
    }

    @Test
    void crear_fechasIncoherentes_fallan() {
        CampaniaLandingRequest req = baseRequest();
        req.setFechaInicio(LocalDateTime.of(2026, 2, 1, 0, 0));
        req.setFechaFin(LocalDateTime.of(2026, 1, 1, 0, 0));
        when(codigoSecuenciaService.nextCodigoCampaniaLanding()).thenReturn("CAM-1");
        assertThrows(BadRequestException.class, () -> service.crear(req, 1L));
    }

    // ----------------------------------------------- validaciones (publicar)

    /** Entidad lista para publicar (nombre + tipo + título), sin CTA ni imagen. */
    private CampaniaLanding publicable(Long id) {
        CampaniaLanding c = entidad(id, EstadoCampaniaLanding.BORRADOR);
        when(repository.findById(id)).thenReturn(Optional.of(c));
        lenient().when(repository.lockPublicada()).thenReturn(Optional.empty());
        return c;
    }

    @Test
    void publicar_ctaIncompleto_falla() {
        CampaniaLanding c = publicable(1L);
        c.setUrlCta("https://x.com"); // sin texto ni tipoDestino
        var ex = assertThrows(BadRequestException.class, () -> service.publicar(1L, 1L));
        assertTrue(ex.getMessage().toLowerCase().contains("cta"));
    }

    @Test
    void publicar_ctaExternoNoHttps_falla() {
        CampaniaLanding c = publicable(1L);
        c.setTextoCta("Ver"); c.setUrlCta("http://x.com"); c.setTipoDestinoCta(TipoDestinoCta.EXTERNO);
        assertThrows(BadRequestException.class, () -> service.publicar(1L, 1L));
    }

    @Test
    void publicar_ctaInternoSinSlash_falla() {
        CampaniaLanding c = publicable(1L);
        c.setTextoCta("Ver"); c.setUrlCta("registro"); c.setTipoDestinoCta(TipoDestinoCta.INTERNO);
        assertThrows(BadRequestException.class, () -> service.publicar(1L, 1L));
    }

    @Test
    void publicar_ctaInternoValido_ok() {
        CampaniaLanding c = publicable(1L);
        c.setTextoCta("Crear cuenta"); c.setUrlCta("/registro"); c.setTipoDestinoCta(TipoDestinoCta.INTERNO);
        assertDoesNotThrow(() -> service.publicar(1L, 1L));
    }

    @Test
    void publicar_imagenSinAlt_falla() {
        CampaniaLanding c = publicable(1L);
        c.setImagenUrlClaro("https://cdn.x/a.png"); // sin alt
        assertThrows(BadRequestException.class, () -> service.publicar(1L, 1L));
    }

    @Test
    void publicar_imagenHttp_falla() {
        CampaniaLanding c = publicable(1L);
        c.setImagenUrlOscuro("http://cdn.x/a.png"); c.setTextoAlternativoImagen("alt");
        assertThrows(BadRequestException.class, () -> service.publicar(1L, 1L));
    }

    @Test
    void publicar_sinImagen_ok() {
        publicable(1L);
        assertEquals(EstadoCampaniaLanding.PUBLICADA, service.publicar(1L, 1L).getEstado());
    }

    @Test
    void publicar_soloImagenClara_ok() {
        CampaniaLanding c = publicable(1L);
        c.setImagenUrlClaro("https://cdn.x/claro.png"); c.setTextoAlternativoImagen("alt");
        assertEquals(EstadoCampaniaLanding.PUBLICADA, service.publicar(1L, 1L).getEstado());
    }

    @Test
    void publicar_soloImagenOscura_ok() {
        CampaniaLanding c = publicable(1L);
        c.setImagenUrlOscuro("https://cdn.x/oscuro.png"); c.setTextoAlternativoImagen("alt");
        assertEquals(EstadoCampaniaLanding.PUBLICADA, service.publicar(1L, 1L).getEstado());
    }

    @Test
    void publicar_ambasImagenes_ok() {
        CampaniaLanding c = publicable(1L);
        c.setImagenUrlClaro("https://cdn.x/claro.png");
        c.setImagenUrlOscuro("https://cdn.x/oscuro.png");
        c.setTextoAlternativoImagen("alt");
        assertEquals(EstadoCampaniaLanding.PUBLICADA, service.publicar(1L, 1L).getEstado());
    }

    // --------------------------------------------------------- actualizar

    @Test
    void actualizar_versionDesfasada_conflict() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.BORRADOR);
        c.setVersion(5L);
        when(repository.findById(1L)).thenReturn(Optional.of(c));
        CampaniaLandingRequest req = baseRequest();
        req.setVersion(3L);
        assertThrows(ConflictException.class, () -> service.actualizar(1L, req, 1L));
    }

    // --------------------------------------------------------- publicar

    @Test
    void publicar_desactivaAnteriorYPublica() {
        CampaniaLanding nueva = entidad(2L, EstadoCampaniaLanding.BORRADOR);
        CampaniaLanding anterior = entidad(1L, EstadoCampaniaLanding.PUBLICADA);
        when(repository.findById(2L)).thenReturn(Optional.of(nueva));
        when(repository.lockPublicada()).thenReturn(Optional.of(anterior));

        CampaniaLandingDTO dto = service.publicar(2L, 9L);

        assertEquals(EstadoCampaniaLanding.INACTIVA, anterior.getEstado());
        assertEquals(EstadoCampaniaLanding.PUBLICADA, dto.getEstado());
        assertEquals(9L, dto.getPublicadaPor());
        assertNotNull(dto.getPublicadaAt());
        verify(repository).saveAndFlush(anterior);
    }

    @Test
    void publicar_sinTitulo_falla() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.BORRADOR);
        c.setTitulo("  ");
        when(repository.findById(1L)).thenReturn(Optional.of(c));
        assertThrows(BadRequestException.class, () -> service.publicar(1L, 1L));
        verify(repository, never()).saveAndFlush(any());
    }

    @Test
    void publicar_sinAnteriorPublicada_ok() {
        CampaniaLanding c = entidad(3L, EstadoCampaniaLanding.BORRADOR);
        when(repository.findById(3L)).thenReturn(Optional.of(c));
        when(repository.lockPublicada()).thenReturn(Optional.empty());
        CampaniaLandingDTO dto = service.publicar(3L, 1L);
        assertEquals(EstadoCampaniaLanding.PUBLICADA, dto.getEstado());
    }

    // --------------------------------------------------------- eliminar

    @Test
    void eliminar_publicada_conflict() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.PUBLICADA);
        when(repository.findById(1L)).thenReturn(Optional.of(c));
        assertThrows(ConflictException.class, () -> service.eliminar(1L));
        verify(repository, never()).delete(any());
    }

    @Test
    void eliminar_borrador_ok() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.BORRADOR);
        when(repository.findById(1L)).thenReturn(Optional.of(c));
        service.eliminar(1L);
        verify(repository).delete(c);
    }

    // --------------------------------------------------------- vigencia/público

    @Test
    void getPublicVigente_sinPublicada_vacio() {
        when(repository.findFirstByEstado(EstadoCampaniaLanding.PUBLICADA)).thenReturn(Optional.empty());
        assertTrue(service.getPublicVigente().isEmpty());
    }

    @Test
    void getPublicVigente_programada_vacio() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.PUBLICADA);
        c.setFechaInicio(LocalDateTime.now(CampaniaLandingService.ZONA).plusDays(3));
        when(repository.findFirstByEstado(EstadoCampaniaLanding.PUBLICADA)).thenReturn(Optional.of(c));
        assertTrue(service.getPublicVigente().isEmpty());
    }

    @Test
    void getPublicVigente_vencida_vacio() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.PUBLICADA);
        c.setFechaFin(LocalDateTime.now(CampaniaLandingService.ZONA).minusDays(1));
        when(repository.findFirstByEstado(EstadoCampaniaLanding.PUBLICADA)).thenReturn(Optional.of(c));
        assertTrue(service.getPublicVigente().isEmpty());
    }

    @Test
    void getPublicVigente_vigente_presenteYSinDatosSensibles() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.PUBLICADA);
        c.setEtiqueta("Nuevo");
        c.setFechaInicio(LocalDateTime.now(CampaniaLandingService.ZONA).minusDays(1));
        c.setFechaFin(LocalDateTime.now(CampaniaLandingService.ZONA).plusDays(1));
        when(repository.findFirstByEstado(EstadoCampaniaLanding.PUBLICADA)).thenReturn(Optional.of(c));
        Optional<CampaniaLandingPublicDTO> dto = service.getPublicVigente();
        assertTrue(dto.isPresent());
        assertEquals("t1", dto.get().getTitulo());
        // El DTO público no tiene campos de auditoría/estado/version por construcción.
    }

    @Test
    void getPublicVigente_exponeAmbasImagenes() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.PUBLICADA);
        c.setImagenUrlClaro("https://cdn.x/claro.png");
        c.setImagenUrlOscuro("https://cdn.x/oscuro.png");
        c.setTextoAlternativoImagen("Banner");
        when(repository.findFirstByEstado(EstadoCampaniaLanding.PUBLICADA)).thenReturn(Optional.of(c));
        CampaniaLandingPublicDTO dto = service.getPublicVigente().orElseThrow();
        // El público devuelve ambas URLs; el tema NO se resuelve en backend.
        assertEquals("https://cdn.x/claro.png", dto.getImagenUrlClaro());
        assertEquals("https://cdn.x/oscuro.png", dto.getImagenUrlOscuro());
        assertEquals("Banner", dto.getTextoAlternativoImagen());
    }

    @Test
    void obtener_publicadaVigente_derivaVIGENTE() {
        CampaniaLanding c = entidad(1L, EstadoCampaniaLanding.PUBLICADA);
        c.setFechaInicio(LocalDateTime.now(CampaniaLandingService.ZONA).minusDays(1));
        when(repository.findById(1L)).thenReturn(Optional.of(c));
        assertEquals(VigenciaCampaniaLanding.VIGENTE, service.obtener(1L).getVigencia());
    }
}
