package com.ecubox.ecubox_backend.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tests para {@link CodigoSecuenciaService}: verifican que cada helper
 * tipado emite la query nativa con los parametros correctos (entity,
 * scope, seed) y formatea el codigo retornado segun el contrato de la
 * entidad correspondiente. La atomicidad real (ON CONFLICT...RETURNING)
 * es responsabilidad de PostgreSQL y se valida en pruebas de integracion
 * con Testcontainers cuando estas se incorporen al proyecto.
 */
@ExtendWith(MockitoExtension.class)
class CodigoSecuenciaServiceTest {

    @Mock private EntityManager entityManager;
    @Mock private Query query;

    private CodigoSecuenciaService service;

    @BeforeEach
    void setUp() throws Exception {
        service = new CodigoSecuenciaService();
        Field em = CodigoSecuenciaService.class.getDeclaredField("entityManager");
        em.setAccessible(true);
        em.set(service, entityManager);

        lenient().when(entityManager.createNativeQuery(anyString())).thenReturn(query);
        lenient().when(query.setParameter(anyString(), org.mockito.ArgumentMatchers.any())).thenReturn(query);
    }

    @Test
    void siguiente_invocaUpsertConSeedMasUnoYDevuelveValor() {
        when(query.getSingleResult()).thenReturn(7L);
        ArgumentCaptor<String> sqlCaptor = ArgumentCaptor.forClass(String.class);

        long n = service.siguiente("PAQUETE_REF", "42", 5L);

        assertThat(n).isEqualTo(7L);
        verify(entityManager).createNativeQuery(sqlCaptor.capture());
        String sql = sqlCaptor.getValue();
        assertThat(sql).contains("INSERT INTO codigo_secuencia");
        assertThat(sql).contains("ON CONFLICT (entity, scope_key) DO UPDATE");
        assertThat(sql).contains("RETURNING next_value");
        verify(query).setParameter("entity", "PAQUETE_REF");
        verify(query).setParameter("scope", "42");
        verify(query).setParameter("seed", 6L);
    }

    @Test
    void nextRefPaquete_formateaConCodigoBaseYNumeroSinPadding() {
        when(query.getSingleResult()).thenReturn(18L);

        String ref = service.nextRefPaquete(50L, "ECU-CV01");

        assertThat(ref).isEqualTo("ECU-CV01-18");
        verify(query).setParameter("entity", CodigoSecuenciaService.ENTITY_PAQUETE_REF);
        verify(query).setParameter("scope", "50");
    }

    @Test
    void nextCodigoAgencia_formateaConDistribuidorYPadding3() {
        when(query.getSingleResult()).thenReturn(7L);

        String codigo = service.nextCodigoAgencia(3L);

        assertThat(codigo).isEqualTo("3-AD-007");
        verify(query).setParameter("entity", CodigoSecuenciaService.ENTITY_AGENCIA_DISTRIBUIDOR);
        verify(query).setParameter("scope", "3");
    }

    @Test
    void nextCodigoDestinatario_usaPrefijoEcuYPadding4YSeedAlto() {
        when(query.getSingleResult()).thenReturn(10001L);

        String codigo = service.nextCodigoDestinatario();

        assertThat(codigo).isEqualTo("ECU-10001");
        verify(query).setParameter("entity", CodigoSecuenciaService.ENTITY_DESTINATARIO_FINAL);
        verify(query).setParameter("scope", CodigoSecuenciaService.SCOPE_GLOBAL);
        // Seed alto (>= 10001) para evitar colision con codigos random historicos.
        verify(query).setParameter("seed", 10_001L);
    }

    @Test
    void nextCodigoManifiesto_formateaConDiaYPadding4() {
        when(query.getSingleResult()).thenReturn(5L);
        LocalDate dia = LocalDate.of(2026, 4, 19);

        String codigo = service.nextCodigoManifiesto(dia);

        assertThat(codigo).isEqualTo("MAN-20260419-0005");
        verify(query).setParameter("entity", CodigoSecuenciaService.ENTITY_MANIFIESTO);
        verify(query).setParameter("scope", "20260419");
    }

    @Test
    void nextTrackingBaseAuto_formateaConPrefijoYPadding8() {
        when(query.getSingleResult()).thenReturn(123L);

        String tracking = service.nextTrackingBaseAuto();

        assertThat(tracking).isEqualTo("AUTO-00000123");
        verify(query).setParameter("entity", CodigoSecuenciaService.ENTITY_GUIA_MASTER_AUTO);
        verify(query).setParameter("scope", CodigoSecuenciaService.SCOPE_GLOBAL);
    }

    @Test
    void siguiente_aceptaInteger_porqueJpaRetornaTiposNumericosVariados() {
        // Postgres puede devolver Integer en lugar de Long segun driver/version.
        // El cast a Number en el servicio debe absorber ambos.
        when(query.getSingleResult()).thenReturn(99);

        long n = service.siguiente("X", "Y", 0L);

        assertThat(n).isEqualTo(99L);
    }

    @Test
    void peek_devuelveSeedMasUnoCuandoFilaNoExiste() {
        when(query.getResultList()).thenReturn(List.of());

        long n = service.peek("PAQUETE_REF", "999", 0L);

        assertThat(n).isEqualTo(1L);
        verify(entityManager).createNativeQuery(contains("SELECT next_value FROM codigo_secuencia"));
        verify(query).setParameter(eq("entity"), eq("PAQUETE_REF"));
        verify(query).setParameter(eq("scope"), eq("999"));
    }

    @Test
    void peek_devuelveValorActualMasUnoCuandoFilaExiste() {
        when(query.getResultList()).thenReturn(List.of(17L));

        long n = service.peek("PAQUETE_REF", "42", 0L);

        assertThat(n).isEqualTo(18L);
    }
}
