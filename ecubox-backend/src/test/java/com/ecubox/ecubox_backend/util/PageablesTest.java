package com.ecubox.ecubox_backend.util;

import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PageablesTest {

    @Test
    void bounded_normalizaPaginaYTamanio() {
        Pageable pageable = Pageables.bounded(-3, 500, 100);

        assertEquals(0, pageable.getPageNumber());
        assertEquals(100, pageable.getPageSize());
    }

    @Test
    void bounded_conservaElOrden() {
        Sort sort = Sort.by(Sort.Direction.DESC, "createdAt");

        Pageable pageable = Pageables.bounded(2, 0, 200, sort);

        assertEquals(2, pageable.getPageNumber());
        assertEquals(1, pageable.getPageSize());
        assertEquals(sort, pageable.getSort());
    }

    @Test
    void bounded_rechazaUnLimiteInvalido() {
        assertThrows(IllegalArgumentException.class, () -> Pageables.bounded(0, 10, 0));
    }
}
