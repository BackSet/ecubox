package com.ecubox.ecubox_backend.service;

import com.ecubox.ecubox_backend.dto.CampaniaLandingDTO;
import com.ecubox.ecubox_backend.dto.CampaniaLandingPublicDTO;
import com.ecubox.ecubox_backend.dto.CampaniaLandingRequest;
import com.ecubox.ecubox_backend.entity.CampaniaLanding;
import com.ecubox.ecubox_backend.entity.Usuario;
import com.ecubox.ecubox_backend.enums.EstadoCampaniaLanding;
import com.ecubox.ecubox_backend.enums.TipoDestinoCta;
import com.ecubox.ecubox_backend.enums.VigenciaCampaniaLanding;
import com.ecubox.ecubox_backend.exception.BadRequestException;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.exception.ResourceNotFoundException;
import com.ecubox.ecubox_backend.repository.CampaniaLandingRepository;
import com.ecubox.ecubox_backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * Lógica de las campañas configurables de la landing. Reglas clave:
 * <ul>
 *   <li>Una sola campaña {@code PUBLICADA} (la publicación desactiva la anterior
 *       en una transacción con lock; el índice único parcial es la defensa final).</li>
 *   <li>La vigencia (PROGRAMADA/VIGENTE/VENCIDA) se deriva de las fechas en zona
 *       {@code America/Guayaquil}; no se persiste.</li>
 *   <li>Validaciones de seguridad: HTTPS para URLs externas/imágenes, bloqueo de
 *       esquemas {@code data:}/{@code javascript:}, sin HTML libre.</li>
 * </ul>
 */
@Service
public class CampaniaLandingService {

    static final ZoneId ZONA = ZoneId.of("America/Guayaquil");

    private final CampaniaLandingRepository repository;
    private final UsuarioRepository usuarioRepository;
    private final CodigoSecuenciaService codigoSecuenciaService;

    public CampaniaLandingService(CampaniaLandingRepository repository,
                                  UsuarioRepository usuarioRepository,
                                  CodigoSecuenciaService codigoSecuenciaService) {
        this.repository = repository;
        this.usuarioRepository = usuarioRepository;
        this.codigoSecuenciaService = codigoSecuenciaService;
    }

    // ---------------------------------------------------------------- lectura

    @Transactional(readOnly = true)
    public List<CampaniaLandingDTO> listar() {
        List<CampaniaLanding> campanias = repository.findAllByOrderByActualizadaAtDesc();
        Map<Long, String> nombres = resolverNombres(campanias);
        LocalDateTime ahora = ahora();
        return campanias.stream().map(c -> toDTO(c, nombres, ahora)).toList();
    }

    @Transactional(readOnly = true)
    public CampaniaLandingDTO obtener(Long id) {
        CampaniaLanding c = buscar(id);
        return toDTO(c, resolverNombres(List.of(c)), ahora());
    }

    /** Campaña pública vigente (PUBLICADA y dentro de la ventana de fechas). */
    @Transactional(readOnly = true)
    public Optional<CampaniaLandingPublicDTO> getPublicVigente() {
        return repository.findFirstByEstado(EstadoCampaniaLanding.PUBLICADA)
                .filter(c -> esVigente(c, ahora()))
                .map(this::toPublicDTO);
    }

    // --------------------------------------------------------------- escritura

    @Transactional
    public CampaniaLandingDTO crear(CampaniaLandingRequest request, Long actorId) {
        CampaniaLanding c = new CampaniaLanding();
        c.setCodigo(codigoSecuenciaService.nextCodigoCampaniaLanding());
        c.setEstado(EstadoCampaniaLanding.BORRADOR);
        c.setCreadaPor(actorId);
        c.setActualizadaPor(actorId);
        aplicar(request, c);
        validarContenido(c);
        return toDTO(repository.save(c), resolverActor(actorId), ahora());
    }

    @Transactional
    public CampaniaLandingDTO actualizar(Long id, CampaniaLandingRequest request, Long actorId) {
        CampaniaLanding c = buscar(id);
        verificarVersion(c, request.getVersion());
        aplicar(request, c);
        c.setActualizadaPor(actorId);
        c.setActualizadaAt(ahora());
        validarContenido(c);
        // Si está publicada y se editó, revalidar requisitos de publicación.
        if (c.getEstado() == EstadoCampaniaLanding.PUBLICADA) {
            validarPublicable(c);
        }
        return toDTO(repository.save(c), resolverActor(actorId), ahora());
    }

    /**
     * Publica la campaña: valida, desactiva la publicada anterior y publica la
     * seleccionada en una sola transacción. El lock pesimista evita carreras y
     * el índice único parcial garantiza la unicidad.
     */
    @Transactional
    public CampaniaLandingDTO publicar(Long id, Long actorId) {
        CampaniaLanding c = buscar(id);
        validarContenido(c);
        validarPublicable(c);
        LocalDateTime ahora = ahora();

        repository.lockPublicada().ifPresent(anterior -> {
            if (!anterior.getId().equals(c.getId())) {
                anterior.setEstado(EstadoCampaniaLanding.INACTIVA);
                anterior.setActualizadaPor(actorId);
                anterior.setActualizadaAt(ahora);
                repository.saveAndFlush(anterior);
            }
        });

        c.setEstado(EstadoCampaniaLanding.PUBLICADA);
        c.setPublicadaAt(ahora);
        c.setPublicadaPor(actorId);
        c.setActualizadaPor(actorId);
        c.setActualizadaAt(ahora);
        return toDTO(repository.save(c), resolverActor(actorId), ahora);
    }

    @Transactional
    public CampaniaLandingDTO desactivar(Long id, Long actorId) {
        CampaniaLanding c = buscar(id);
        if (c.getEstado() == EstadoCampaniaLanding.INACTIVA) {
            return toDTO(c, resolverActor(actorId), ahora());
        }
        c.setEstado(EstadoCampaniaLanding.INACTIVA);
        c.setActualizadaPor(actorId);
        c.setActualizadaAt(ahora());
        return toDTO(repository.save(c), resolverActor(actorId), ahora());
    }

    @Transactional
    public void eliminar(Long id) {
        CampaniaLanding c = buscar(id);
        if (c.getEstado() == EstadoCampaniaLanding.PUBLICADA) {
            throw new ConflictException("No se puede eliminar una campaña publicada. Desactívala primero.");
        }
        repository.delete(c);
    }

    // ---------------------------------------------------------------- helpers

    private CampaniaLanding buscar(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Campaña", id));
    }

    private void verificarVersion(CampaniaLanding c, Long versionEsperada) {
        if (versionEsperada != null && !versionEsperada.equals(c.getVersion())) {
            throw new ConflictException(
                    "La campaña fue modificada por otra persona. Recarga e intenta de nuevo.");
        }
    }

    private void aplicar(CampaniaLandingRequest req, CampaniaLanding c) {
        c.setNombreInterno(trimToNull(req.getNombreInterno()));
        c.setTipo(req.getTipo());
        c.setEtiqueta(trimToNull(req.getEtiqueta()));
        c.setTitulo(trimToNull(req.getTitulo()));
        c.setDescripcion(trimToNull(req.getDescripcion()));
        c.setTextoCta(trimToNull(req.getTextoCta()));
        c.setUrlCta(trimToNull(req.getUrlCta()));
        c.setTipoDestinoCta(req.getTipoDestinoCta());
        c.setImagenUrl(trimToNull(req.getImagenUrl()));
        c.setTextoAlternativoImagen(trimToNull(req.getTextoAlternativoImagen()));
        c.setFechaInicio(req.getFechaInicio());
        c.setFechaFin(req.getFechaFin());
    }

    /** Validaciones cruzadas de contenido (aplican a borrador y publicación). */
    private void validarContenido(CampaniaLanding c) {
        if (trimToNull(c.getNombreInterno()) == null) {
            throw new BadRequestException("El nombre interno es obligatorio");
        }
        if (c.getTipo() == null) {
            throw new BadRequestException("El tipo es obligatorio");
        }
        if (c.getFechaInicio() != null && c.getFechaFin() != null
                && !c.getFechaFin().isAfter(c.getFechaInicio())) {
            throw new BadRequestException("La fecha de fin debe ser posterior a la de inicio");
        }
        validarCta(c);
        validarImagen(c);
    }

    private void validarCta(CampaniaLanding c) {
        boolean algunCampo = c.getTextoCta() != null || c.getUrlCta() != null || c.getTipoDestinoCta() != null;
        if (!algunCampo) return; // CTA opcional: ausente por completo es válido.
        if (c.getTextoCta() == null || c.getUrlCta() == null || c.getTipoDestinoCta() == null) {
            throw new BadRequestException(
                    "El CTA requiere texto, URL y tipo de destino; complétalos o déjalos vacíos.");
        }
        String url = c.getUrlCta();
        rechazarEsquemaPeligroso(url, "la URL del CTA");
        if (c.getTipoDestinoCta() == TipoDestinoCta.INTERNO) {
            if (!url.startsWith("/")) {
                throw new BadRequestException("Una URL interna debe empezar con «/» (ruta del sitio).");
            }
        } else if (!esHttps(url)) {
            throw new BadRequestException("Una URL externa debe usar HTTPS.");
        }
    }

    private void validarImagen(CampaniaLanding c) {
        if (c.getImagenUrl() == null) return;
        rechazarEsquemaPeligroso(c.getImagenUrl(), "la URL de la imagen");
        if (!esHttps(c.getImagenUrl())) {
            throw new BadRequestException("La imagen debe servirse por HTTPS.");
        }
        if (trimToNull(c.getTextoAlternativoImagen()) == null) {
            throw new BadRequestException("El texto alternativo es obligatorio cuando hay imagen.");
        }
    }

    /** Requisitos adicionales para poder publicar. */
    private void validarPublicable(CampaniaLanding c) {
        if (trimToNull(c.getTitulo()) == null) {
            throw new BadRequestException("El título es obligatorio para publicar.");
        }
    }

    private void rechazarEsquemaPeligroso(String url, String campo) {
        String low = url.trim().toLowerCase();
        if (low.startsWith("javascript:") || low.startsWith("data:") || low.startsWith("vbscript:")) {
            throw new BadRequestException("No se permite ese tipo de URL en " + campo + ".");
        }
    }

    private boolean esHttps(String url) {
        return url.trim().toLowerCase().startsWith("https://");
    }

    private static String trimToNull(String s) {
        if (s == null) return null;
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    private LocalDateTime ahora() {
        return LocalDateTime.now(ZONA);
    }

    private boolean esVigente(CampaniaLanding c, LocalDateTime ahora) {
        if (c.getEstado() != EstadoCampaniaLanding.PUBLICADA) return false;
        boolean iniciada = c.getFechaInicio() == null || !c.getFechaInicio().isAfter(ahora);
        boolean noVencida = c.getFechaFin() == null || ahora.isBefore(c.getFechaFin());
        return iniciada && noVencida;
    }

    /** Vigencia derivada para una campaña publicada (null si no está publicada). */
    private VigenciaCampaniaLanding vigencia(CampaniaLanding c, LocalDateTime ahora) {
        if (c.getEstado() != EstadoCampaniaLanding.PUBLICADA) return null;
        if (c.getFechaInicio() != null && c.getFechaInicio().isAfter(ahora)) {
            return VigenciaCampaniaLanding.PROGRAMADA;
        }
        if (c.getFechaFin() != null && !ahora.isBefore(c.getFechaFin())) {
            return VigenciaCampaniaLanding.VENCIDA;
        }
        return VigenciaCampaniaLanding.VIGENTE;
    }

    private Map<Long, String> resolverActor(Long actorId) {
        if (actorId == null) return Map.of();
        return usuarioRepository.findById(actorId)
                .map(u -> Map.of(u.getId(), u.getUsername()))
                .orElse(Map.of());
    }

    private Map<Long, String> resolverNombres(List<CampaniaLanding> campanias) {
        var ids = campanias.stream()
                .flatMap(c -> java.util.stream.Stream.of(c.getActualizadaPor(), c.getPublicadaPor(), c.getCreadaPor()))
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (ids.isEmpty()) return Map.of();
        java.util.Map<Long, String> map = new java.util.HashMap<>();
        for (Usuario u : usuarioRepository.findAllById(ids)) {
            map.put(u.getId(), u.getUsername());
        }
        return map;
    }

    private static String nombreDe(Map<Long, String> nombres, Long id) {
        return id == null ? null : nombres.get(id);
    }

    private CampaniaLandingDTO toDTO(CampaniaLanding c, Map<Long, String> nombres, LocalDateTime ahora) {
        return CampaniaLandingDTO.builder()
                .id(c.getId())
                .codigo(c.getCodigo())
                .nombreInterno(c.getNombreInterno())
                .estado(c.getEstado())
                .vigencia(vigencia(c, ahora))
                .tipo(c.getTipo())
                .etiqueta(c.getEtiqueta())
                .titulo(c.getTitulo())
                .descripcion(c.getDescripcion())
                .textoCta(c.getTextoCta())
                .urlCta(c.getUrlCta())
                .tipoDestinoCta(c.getTipoDestinoCta())
                .imagenUrl(c.getImagenUrl())
                .textoAlternativoImagen(c.getTextoAlternativoImagen())
                .fechaInicio(c.getFechaInicio())
                .fechaFin(c.getFechaFin())
                .publicadaAt(c.getPublicadaAt())
                .publicadaPor(c.getPublicadaPor())
                .publicadaPorNombre(nombreDe(nombres, c.getPublicadaPor()))
                .creadaAt(c.getCreadaAt())
                .creadaPor(c.getCreadaPor())
                .actualizadaAt(c.getActualizadaAt())
                .actualizadaPor(c.getActualizadaPor())
                .actualizadaPorNombre(nombreDe(nombres, c.getActualizadaPor()))
                .version(c.getVersion())
                .build();
    }

    private CampaniaLandingPublicDTO toPublicDTO(CampaniaLanding c) {
        return CampaniaLandingPublicDTO.builder()
                .codigo(c.getCodigo())
                .tipo(c.getTipo())
                .etiqueta(c.getEtiqueta())
                .titulo(c.getTitulo())
                .descripcion(c.getDescripcion())
                .textoCta(c.getTextoCta())
                .urlCta(c.getUrlCta())
                .tipoDestinoCta(c.getTipoDestinoCta())
                .imagenUrl(c.getImagenUrl())
                .textoAlternativoImagen(c.getTextoAlternativoImagen())
                .build();
    }
}
