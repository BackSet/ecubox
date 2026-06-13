package com.ecubox.ecubox_backend.service.validation;

import com.ecubox.ecubox_backend.entity.Paquete;
import com.ecubox.ecubox_backend.enums.EstadoRevisionPaquete;
import com.ecubox.ecubox_backend.exception.ConflictException;
import com.ecubox.ecubox_backend.repository.RevisionPaqueteRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaqueteOperacionValidatorTest {

    @Mock private RevisionPaqueteRepository revisionPaqueteRepository;

    @Test
    void requireOperativo_bloqueaRevisionActiva() {
        when(revisionPaqueteRepository.existsByPaqueteIdAndEstado(
                3L, EstadoRevisionPaquete.EN_REVISION)).thenReturn(true);
        PaqueteOperacionValidator validator = new PaqueteOperacionValidator(revisionPaqueteRepository);

        assertThrows(ConflictException.class,
                () -> validator.requireOperativo(Paquete.builder().id(3L).numeroGuia("PK-3").build()));
    }

    @Test
    void filtrarOperativos_excluyeRevisadosDeSelectores() {
        Paquete primero = Paquete.builder().id(1L).build();
        Paquete revisado = Paquete.builder().id(2L).build();
        when(revisionPaqueteRepository.findPaqueteIdsByEstado(
                List.of(1L, 2L), EstadoRevisionPaquete.EN_REVISION)).thenReturn(List.of(2L));
        PaqueteOperacionValidator validator = new PaqueteOperacionValidator(revisionPaqueteRepository);

        List<Paquete> result = validator.filtrarOperativos(List.of(primero, revisado));

        assertEquals(List.of(primero), result);
    }
}
